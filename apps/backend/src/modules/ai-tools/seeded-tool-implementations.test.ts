import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { runAiTool } from "./ai-tool-runner.js";
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

    if (req.url === "/login" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body>login</body></html>");
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
    const result = await runAiTool(createSeededTool("seed-service-scan"), {
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
    const result = await runAiTool(createSeededTool("seed-content-discovery"), {
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
    const result = await runAiTool(createSeededTool("seed-web-crawl"), {
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
    const result = await runAiTool(createSeededTool("seed-vuln-audit"), {
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
      expect.objectContaining({ key: "audit:/files" }),
      expect.objectContaining({ key: "audit:headers" })
    ]));
  });

  it("sql injection check confirms a bypass signal on /login", async () => {
    const result = await runAiTool(createSeededTool("seed-sql-injection-check"), {
      target: "127.0.0.1",
      baseUrl
    });

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeNull();
    expect(result.output).toContain("Login endpoint appears injectable");
    expect(result.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "sqli:/login" })
    ]));
  });
});
