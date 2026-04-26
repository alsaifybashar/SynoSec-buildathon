import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { runAiTool } from "./ai-tool-runner.js";
import { MemoryAiToolsRepository } from "./memory-ai-tools.repository.js";
import { createToolRuntime } from "./tool-runtime.js";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";

let server: http.Server;
let baseUrl: string;
let port: number;

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
  server = http.createServer((req, res) => {
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
      const url = new URL(req.url, baseUrl || "http://127.0.0.1");
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

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to bind test server");
      }
      port = address.port;
      baseUrl = `http://127.0.0.1:${port}/`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

describe("seeded bash tool implementations", () => {
  it("service scan reports the open test port", async () => {
    const tool = createSeededTool("seed-service-scan");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      port,
      baseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain(`127.0.0.1:${port} open`);
    expect(result.observations).toHaveLength(1);
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        port,
        title: `Open TCP port ${port}`
      })
    ]));
  });

  it("content discovery returns reachable seeded paths", async () => {
    const tool = createSeededTool("seed-content-discovery");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("200 /admin");
    expect(result.output).toContain("200 /api/users");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "content:/admin" }),
      expect.objectContaining({ key: "content:/api/users" })
    ]));
  });

  it("web crawl follows in-scope links from the start page", async () => {
    const tool = createSeededTool("seed-web-crawl");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl
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

  it("vulnerability audit confirms seeded exposure signals", async () => {
    const tool = createSeededTool("seed-vuln-audit");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("Unauthenticated admin panel exposed");
    expect(result.output).toContain("Sensitive user data exposed without authentication");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "audit:/admin" }),
      expect.objectContaining({ key: "audit:/api/users" }),
      expect.objectContaining({
        key: "audit:/files",
        title: "Public file index exposes secret-bearing artifacts"
      })
    ]));
  });

  it("sql injection check confirms a bypass signal on /login", async () => {
    const tool = createSeededTool("seed-sql-injection-check");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      baseUrl
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
      url: `${baseUrl}search`,
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
      url: `${baseUrl}admin`
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("Login flow did not rate-limit repeated failures");
  });

  it("parameter discovery identifies reflected search parameters without external binaries", async () => {
    const tool = createSeededTool("seed-arjun");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${baseUrl}search`,
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

  it("paramspider identifies reflected search parameters without external binaries", async () => {
    const tool = createSeededTool("seed-paramspider");
    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "127.0.0.1",
      url: `${baseUrl}search`,
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
      url: `${baseUrl}search`,
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
      baseUrl
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
