import http from "node:http";
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { runAiTool } from "./ai-tool-runner.js";
import { MemoryAiToolsRepository } from "./memory-ai-tools.repository.js";
import { createToolRuntime } from "./tool-runtime.js";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";

let vulnerableServer: http.Server;
let vulnerableBaseUrl: string;
let vulnerablePort: number;
let attackPathServer: http.Server;
let attackPathBaseUrl: string;

function startServer(handler: http.RequestListener) {
  const server = http.createServer(handler);
  return new Promise<{ server: http.Server; baseUrl: string; port: number }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to bind test server");
      }
      resolve({
        server,
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}/`
      });
    });
  });
}

function createSeededTool(id: string): AiTool {
  const definition = seededToolDefinitions.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Unknown seeded tool: ${id}`);
  }

  return {
    ...definition,
    status: "active",
    source: "system",
    description: definition.description ?? null,
    capabilities: [...definition.capabilities],
    inputSchema: { ...definition.inputSchema },
    outputSchema: { ...definition.outputSchema },
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z"
  };
}

function createRuntime(tool: AiTool) {
  return createToolRuntime(new MemoryAiToolsRepository([tool]));
}

beforeAll(async () => {
  const vulnerable = await startServer((req, res) => {
    res.setHeader("X-Powered-By", "VulnerableApp/1.0 PHP/5.6.40");
    res.setHeader("Server", "Apache/2.2.34 (Ubuntu)");

    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <html>
          <head><title>Seeded Test App</title></head>
          <body>
            <a href="/admin">Admin</a>
            <a href="/api/users">Users</a>
            <a href="/files">Files</a>
            <a href="/search">Search</a>
          </body>
        </html>
      `);
      return;
    }

    if (req.url === "/admin") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body><h1>Administrator Control Panel</h1><p>No authentication required</p></body></html>");
      return;
    }

    if (req.url === "/api/users") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([{ id: 1, username: "admin", passwordHash: "abc", ssn: "123-45-6789" }]));
      return;
    }

    if (req.url === "/files") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body><h1>Index of /files</h1><pre>id_rsa\n.env.production</pre></body></html>");
      return;
    }

    if (req.url?.startsWith("/search") && req.method === "GET") {
      const url = new URL(req.url, vulnerableBaseUrl || "http://127.0.0.1");
      const q = url.searchParams.get("q") || "";
      if (q.includes("'")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<html><body><p>query error near SELECT * FROM users: ${q}</p></body></html>`);
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<html><body>search ${q}</body></html>`);
      return;
    }

    if (req.url === "/login" && req.method === "GET") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }

    if (req.url === "/login" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        if (body.includes("%27") || body.includes("'")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            message: "Authentication bypassed via SQL injection",
            debug: {
              query: "SELECT * FROM users WHERE username='' OR '1'='1' AND password='test'",
              user: { id: 1, username: "admin" }
            }
          }));
          return;
        }

        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false }));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
  });
  vulnerableServer = vulnerable.server;
  vulnerableBaseUrl = vulnerable.baseUrl;
  vulnerablePort = vulnerable.port;

  const attackPath = await startServer((req, res) => {
    res.setHeader("X-Powered-By", "ReleaseHub/0.9.7-beta");
    res.setHeader("Server", "nginx/1.18.0");

    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <html>
          <body>
            <a href="/release-board">Release board</a>
            <a href="/diagnostics/export">Diagnostics export</a>
            <a href="/search?q=release">Search</a>
            <a href="/health">Health</a>
          </body>
        </html>
      `);
      return;
    }

    if (req.url === "/release-board") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <html>
          <body>
            <table>
              <tr><td>rc-2026-04</td><td>acme-retail</td><td>case-7312</td></tr>
            </table>
            <p>Approval notes are tracked in support case records before release secrets are issued.</p>
          </body>
        </html>
      `);
      return;
    }

    if (req.url === "/diagnostics/export") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end([
        "# Release diagnostics export",
        "build=rc-2026-04",
        "approver_email=release-manager@acme-retail.demo",
        "nonce_seed=ops-bot-4471",
        "job=promotion-window-validation"
      ].join("\n"));
      return;
    }

    if (req.url === "/api/support/cases/case-7312?workspace=acme-retail") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        caseRef: "case-7312",
        workspace: "acme-retail",
        notes: [
          "Approver requested one-time release authorization for tonight's promotion cutover.",
          "Approval token for rc-2026-04: approve_rc_2026_demo"
        ]
      }));
      return;
    }

    if (req.url === "/api/release/secrets?build=rc-2026-04&approval=approve_rc_2026_demo") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        build: "rc-2026-04",
        scope: "production-release",
        secrets: {
          signingKey: "prod-signing-key-demo-2026",
          artifactBucket: "s3://acme-retail-release-artifacts/prod",
          deployToken: "deploy-token-rc-2026"
        }
      }));
      return;
    }

    if (req.url === "/api/release/secrets?build=rc-2026-04&session=mgr_session_rc_2026_demo") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        build: "rc-2026-04",
        scope: "production-release",
        secrets: {
          signingKey: "prod-signing-key-demo-2026",
          artifactBucket: "s3://acme-retail-release-artifacts/prod",
          deployToken: "deploy-token-rc-2026"
        }
      }));
      return;
    }

    if (req.url?.startsWith("/api/release/secrets")) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "Release secret access denied",
        hint: "Provide the current build id plus either a release approval token or a release-manager session."
      }));
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "degraded",
        releaseWorker: "delayed",
        internalCluster: "release-cluster-2"
      }));
      return;
    }

    if (req.url?.startsWith("/search")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body><h1>Search</h1></body></html>");
      return;
    }

    if (req.url === "/api/auth/magic-link" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        const params = new URLSearchParams(body);
        if (
          params.get("email") === "release-manager@acme-retail.demo"
          && params.get("nonce") === "ops-bot-4471"
        ) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            role: "release-manager",
            sessionToken: "mgr_session_rc_2026_demo"
          }));
          return;
        }

        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: false,
          error: "Unable to issue magic link"
        }));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
  });
  attackPathServer = attackPath.server;
  attackPathBaseUrl = attackPath.baseUrl;
});

afterAll(async () => {
  await Promise.all([vulnerableServer, attackPathServer].map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  })));
});

describe("seeded bash tool implementations", () => {
  it("gives every seeded tool an agent-facing description", () => {
    for (const tool of seededToolDefinitions) {
      const description = tool.description ?? "";
      const guidanceSignals = [
        /\bUse\b/i,
        /\bProvide\b/i,
        /\bReturns\b/i,
        /\bDo not\b/i,
        /\bdoes not\b/i,
        /\bonly\b/i
      ].filter((pattern) => pattern.test(description));

      expect(description.length, `${tool.id} description should be specific enough for agent selection`).toBeGreaterThanOrEqual(140);
      expect(guidanceSignals.length, `${tool.id} description should explain use, inputs, outputs, or boundaries`).toBeGreaterThanOrEqual(3);
    }
  });

  it("service scan reports the open test port", async () => {
    const tool = createSeededTool("seed-service-scan");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      port: vulnerablePort,
      baseUrl: vulnerableBaseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain(`127.0.0.1:${vulnerablePort} open`);
    expect(result.observations).toHaveLength(1);
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        port: vulnerablePort,
        title: `Open TCP port ${vulnerablePort}`
      })
    ]));
  });

  it("service scan respects candidate port ordering and bounds", async () => {
    const tool = createSeededTool("seed-service-scan");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      candidatePorts: [1, vulnerablePort, 2],
      maxPorts: 2
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    const lines = result.output.split("\n");
    expect(lines[0]).toContain("127.0.0.1:1");
    expect(lines[1]).toContain(`127.0.0.1:${vulnerablePort} open`);
    expect(lines).toHaveLength(2);
  });

  it("content discovery discovers linked exposure paths without demo-specific defaults", async () => {
    const tool = createSeededTool("seed-content-discovery");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("200 /admin");
    expect(result.output).toContain("200 /api/users");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "content:/admin" }),
      expect.objectContaining({
        key: "content:/api/users",
        evidence: expect.stringContaining("passwordHash")
      })
    ]));
  });

  it("content discovery respects candidatePaths and surfaces chain artifacts", async () => {
    const tool = createSeededTool("seed-content-discovery");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: attackPathBaseUrl,
      candidatePaths: ["/release-board", "/diagnostics/export"],
      maxPaths: 4
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("200 /release-board");
    expect(result.output).toContain("200 /diagnostics/export");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "content:/release-board",
        evidence: expect.stringContaining("buildId=rc-2026-04")
      }),
      expect.objectContaining({
        key: "content:/diagnostics/export",
        evidence: expect.stringContaining("nonce=ops-bot-4471")
      })
    ]));
  });

  it("web crawl follows in-scope links from the start page", async () => {
    const tool = createSeededTool("seed-web-crawl");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("200 /");
    expect(result.output).toContain("200 /admin");
    expect(result.output).toContain("200 /api/users");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "crawl:/" }),
      expect.objectContaining({ key: "crawl:/admin" }),
      expect.objectContaining({ key: "crawl:/api/users" })
    ]));
  });

  it("web crawl incorporates supplied candidate endpoints with deterministic bounds", async () => {
    const tool = createSeededTool("seed-web-crawl");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: attackPathBaseUrl,
      candidateEndpoints: ["/release-board", "/diagnostics/export"],
      maxPages: 3
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("200 /release-board");
    expect(result.output).toContain("200 /diagnostics/export");
    expect(result.output.split("\n")).toHaveLength(3);
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "crawl:/release-board",
        evidence: expect.stringContaining("caseRef=case-7312")
      }),
      expect.objectContaining({
        key: "crawl:/diagnostics/export",
        evidence: expect.stringContaining("approverEmail=release-manager@acme-retail.demo")
      })
    ]));
  });

  it("vulnerability audit confirms classic exposure signals", async () => {
    const tool = createSeededTool("seed-vuln-audit");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("Unauthenticated access confirmed at /admin");
    expect(result.output).toContain("Sensitive response confirmed at /api/users");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "audit:unauthenticated:/admin",
        summary: expect.stringContaining("Unauthenticated:")
      }),
      expect.objectContaining({
        key: "audit:sensitive:/api/users",
        summary: expect.stringContaining("Sensitive response:")
      }),
      expect.objectContaining({
        key: "audit:sensitive:/files",
        title: "Sensitive response confirmed at /files"
      })
    ]));
  });

  it("vulnerability audit validates the release-board to approval-token chain", async () => {
    const tool = createSeededTool("seed-vuln-audit");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: attackPathBaseUrl,
      validationTargets: [
        {
          path: "/release-board",
          expectedEvidenceStrings: ["rc-2026-04", "case-7312"]
        },
        {
          path: "/api/support/cases/case-7312",
          query: { workspace: "acme-retail" },
          expectedEvidenceStrings: ["Approval token for rc-2026-04: approve_rc_2026_demo"]
        },
        {
          path: "/api/release/secrets",
          query: { build: "rc-2026-04", approval: "approve_rc_2026_demo" },
          expectedAuthBehavior: "requires-auth",
          expectedEvidenceFields: ["signingKey", "deployToken"]
        }
      ]
    });

    expect(result.exitCode).toBe(0);
    expect(result.observations.some((observation) => (
      observation.key === "audit:chain-artifact:/api/support/cases/case-7312?workspace=acme-retail"
      && observation.evidence.includes("Baseline status: 404")
    ))).toBe(true);
    expect(result.observations.some((observation) => (
      observation.key.startsWith("audit:reachable:GET:/api/release/secrets?")
      && observation.evidence.includes("Baseline status: 403")
    ))).toBe(true);
    expect(result.observations.some((observation) => (
      observation.key.startsWith("audit:sensitive:/api/release/secrets?")
      && observation.evidence.includes("signingKey")
    ))).toBe(true);
  });

  it("vulnerability audit validates the diagnostics to magic-link session chain", async () => {
    const tool = createSeededTool("seed-vuln-audit");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: attackPathBaseUrl,
      validationTargets: [
        {
          path: "/diagnostics/export",
          expectedEvidenceStrings: [
            "build=rc-2026-04",
            "approver_email=release-manager@acme-retail.demo",
            "nonce_seed=ops-bot-4471"
          ]
        },
        {
          path: "/api/auth/magic-link",
          method: "POST",
          body: {
            email: "release-manager@acme-retail.demo",
            nonce: "ops-bot-4471"
          },
          expectedAuthBehavior: "requires-auth",
          expectedEvidenceFields: ["sessionToken"]
        },
        {
          path: "/api/release/secrets",
          query: { build: "rc-2026-04", session: "mgr_session_rc_2026_demo" },
          expectedAuthBehavior: "requires-auth",
          expectedEvidenceFields: ["signingKey", "deployToken"]
        }
      ]
    });

    expect(result.exitCode).toBe(0);
    expect(result.observations.some((observation) => (
      observation.key === "audit:chain-artifact:/diagnostics/export"
      && observation.evidence.includes("nonce=ops-bot-4471")
    ))).toBe(true);
    expect(result.observations.some((observation) => (
      observation.key === "audit:chain-artifact:/api/auth/magic-link"
      && observation.evidence.includes("Baseline status: 401")
    ))).toBe(true);
    expect(result.observations.some((observation) => (
      observation.key.startsWith("audit:sensitive:/api/release/secrets?")
      && observation.evidence.includes("Baseline status: 403")
    ))).toBe(true);
  });

  it("sql injection check confirms a bypass signal on /login", async () => {
    const tool = createSeededTool("seed-sql-injection-check");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("/login appears injectable");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "sqli:/login" })
    ]));
  });

  it("sql injection check respects an explicit path instead of pivoting to /login", async () => {
    const tool = createSeededTool("seed-sql-injection-check");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${vulnerableBaseUrl}search`,
      method: "GET",
      parameters: ["q"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("/search?q=%27+OR+%271%27%3D%271 appears injectable");
    expect(result.output).not.toContain("/login");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "sqli:/search?q=%27+OR+%271%27%3D%271" })
    ]));
  });

  it("auth flow probe derives /login from a non-login page and tolerates GET /login returning 404", async () => {
    const tool = createSeededTool("seed-auth-flow-probe");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${vulnerableBaseUrl}admin`
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("Login flow did not rate-limit repeated failures");
  });

  it("auth flow probe validates a supplied magic-link artifact target", async () => {
    const tool = createSeededTool("seed-auth-flow-probe");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: attackPathBaseUrl,
      validationTargets: [
        {
          path: "/api/auth/magic-link",
          method: "POST",
          body: {
            email: "release-manager@acme-retail.demo",
            nonce: "ops-bot-4471"
          },
          expectedAuthBehavior: "artifact-issues-session",
          expectedEvidenceFields: ["sessionToken"]
        }
      ]
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "auth-flow:/api/auth/magic-link",
        evidence: expect.stringContaining("Artifact status: 200")
      })
    ]));
    expect(result.observations[0]?.evidence).toContain("Matched fields: sessionToken");
  });

  it("parameter discovery identifies reflected search parameters without external binaries", async () => {
    const tool = createSeededTool("seed-arjun");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${vulnerableBaseUrl}search`,
      parameters: ["q", "query", "search"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("q");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "parameter:q",
        title: "Likely parameter discovered: q"
      })
    ]));
  });

  it("parameter discovery respects candidate endpoints and candidate parameters", async () => {
    const tool = createSeededTool("seed-arjun");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl,
      candidateEndpoints: ["/search"],
      candidateParameters: ["page", "q"],
      maxRequests: 2
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("q");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "parameter:q",
        evidence: expect.stringContaining("Request target:")
      })
    ]));
  });

  it("paramspider identifies reflected search parameters without external binaries", async () => {
    const tool = createSeededTool("seed-paramspider");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${vulnerableBaseUrl}search`,
      parameters: ["q", "query", "search"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("q");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "parameter:q",
        title: "Likely parameter discovered: q"
      })
    ]));
  });

  it("xss validation confirms reflected payloads without external binaries", async () => {
    const tool = createSeededTool("seed-dalfox");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${vulnerableBaseUrl}search`,
      parameters: ["q"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("reflected");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: expect.stringContaining("xss:/search"),
        title: expect.stringContaining("Reflected input")
      })
    ]));
  });

  it("xss validation honors explicit endpoint and parameter steering", async () => {
    const tool = createSeededTool("seed-dalfox");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl,
      candidateEndpoints: ["/search"],
      candidateParameters: ["q"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "xss:/search",
        evidence: expect.stringContaining("Parameter: q")
      })
    ]));
  });

  it("jwt analyzer stays offline and emits deterministic claim artifacts", async () => {
    const tool = createSeededTool("seed-jwt-analyzer");
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "release-key-1" })).toString("base64url");
    const claims = Buffer.from(JSON.stringify({
      iss: "releasehub",
      sub: "release-manager",
      aud: "release-api",
      iat: 1777200000,
      exp: 1777203600,
      role: "release-manager",
      workspace: "acme-retail"
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", "secret").update(`${header}.${claims}`).digest("base64url");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      token: `${header}.${claims}.${signature}`,
      target: "releasehub"
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("kid");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "jwt:releasehub:header" }),
      expect.objectContaining({ key: "jwt:releasehub:claim:role" }),
      expect.objectContaining({ key: "jwt:releasehub:weak-secret" })
    ]));
  });

  it("http headers probes supplied candidate endpoints deterministically", async () => {
    const tool = createSeededTool("seed-http-headers");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl,
      candidateEndpoints: ["/admin", "/api/users"],
      maxEndpoints: 2
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("/admin");
    expect(result.output).toContain("/api/users");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "headers:/admin",
        evidence: expect.stringContaining("server=Apache/2.2.34")
      })
    ]));
  });

  it("hash identification classifies MD5 hashes without external binaries", async () => {
    const tool = createSeededTool("seed-hash-identifier");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      hash: "5f4dcc3b5aa765d61d8327deb882cf99"
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("MD5");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "hash-type:md5",
        title: "Identified hash format: MD5"
      })
    ]));
  });

  it("cipher identification classifies hex-like material without external binaries", async () => {
    const tool = createSeededTool("seed-cipher-identifier");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      hash: "5f4dcc3b5aa765d61d8327deb882cf99"
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output.toLowerCase()).toContain("hex");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "cipher-format:hex-like"
      })
    ]));
  });

  it("offline password cracking recovers known demo hashes without external binaries", async () => {
    const tool = createSeededTool("seed-hashcat-crack");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      hash: "5f4dcc3b5aa765d61d8327deb882cf99",
      hashType: "md5"
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("password");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "hashcat:cracked:md5",
        title: "Offline password crack succeeded"
      })
    ]));
  });

  it("john the ripper recovers known demo hashes without external binaries", async () => {
    const tool = createSeededTool("seed-john-the-ripper");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      hash: "5f4dcc3b5aa765d61d8327deb882cf99",
      hashType: "md5"
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("password");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "john:cracked:md5",
        title: "Offline password crack succeeded"
      })
    ]));
  });

  it("tls audit records plaintext HTTP endpoints instead of failing without evidence", async () => {
    const tool = createSeededTool("seed-tls-audit");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl: vulnerableBaseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("plaintext HTTP target");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: expect.stringContaining("tls:127.0.0.1"),
        title: expect.stringContaining("Plaintext HTTP endpoint")
      })
    ]));
  });
});
