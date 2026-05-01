import { createServer } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { runAiTool } from "@/modules/ai-tools/ai-tool-runner.js";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import { createToolRuntime } from "@/modules/ai-tools/tool-runtime.js";

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "Bash Probe",
    status: "active",
    source: "custom",
    description: "Deterministic test tool",
    executorType: "bash",
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["passive"],
    category: "utility",
    riskTier: "passive",
    timeoutMs: 1000,
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: { type: "string" },
        target: { type: "string" }
      },
      required: ["baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      },
      required: ["output"]
    },
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
    ...overrides
  };
}

function createRuntime(tool: AiTool) {
  return createToolRuntime(new MemoryAiToolsRepository([tool]));
}

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  })));
  servers.length = 0;
});

describe("runAiTool", () => {
  it("rejects missing required inputs before executing the tool", async () => {
    const tool = createTool();
    await expect(runAiTool(createRuntime(tool), tool.id, { target: "example.com" })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_INPUT_MISSING"
    });
  });

  it("derives the execution target from baseUrl input", async () => {
    const tool = createTool({
      bashSource: [
        "#!/usr/bin/env bash",
        "payload=\"$(cat)\"",
        "target=\"$(printf '%s' \"$payload\" | node -e 'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");process.stdout.write(parsed.request.target);});')\"",
        "printf '{\"output\":\"target=%s\"}\\n' \"$target\""
      ].join("\n")
    });

    const result = await runAiTool(createRuntime(tool), tool.id, { baseUrl: "http://scanner.test:8080/path?q=1" });

    expect(result.target).toBe("scanner.test");
    expect(result.port).toBe(8080);
    expect(result.output).toBe("target=scanner.test");
    expect(result.commandPreview).toContain("target=scanner.test");
    expect(result.commandPreview).toContain("baseUrl=http://scanner.test:8080/path?q=1");
  });

  it("derives the execution target from a URL-shaped target while preserving the exact path in tool input", async () => {
    const tool = createTool({
      bashSource: [
        "#!/usr/bin/env bash",
        "payload=\"$(cat)\"",
        "printf '%s' \"$payload\" | node -e 'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");const toolInput=parsed.request.parameters.toolInput;process.stdout.write(JSON.stringify({output:JSON.stringify({target:parsed.request.target,baseUrl:toolInput.baseUrl,url:toolInput.url})}));});'"
      ].join("\n")
    });

    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "http://scanner.test:8080/search?q=1"
    });

    expect(result.target).toBe("scanner.test");
    expect(result.port).toBe(8080);
    expect(result.output).toBe(JSON.stringify({
      target: "scanner.test",
      baseUrl: "http://scanner.test:8080/search?q=1"
    }));
    expect(result.commandPreview).toContain("baseUrl=http://scanner.test:8080/search?q=1");
  });

  it("rejects tool runs that omit an execution target", async () => {
    const tool = createTool({
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"localhost\"}'"
    });

    await expect(runAiTool(createRuntime(tool), tool.id, {})).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_TARGET_MISSING"
    });
  });

  it("rejects malformed execution URLs instead of falling back", async () => {
    const tool = createTool();
    await expect(runAiTool(createRuntime(tool), tool.id, {
      baseUrl: "http//scanner.test"
    })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_TARGET_INVALID"
    });
  });

  it("rejects builtin tools in the direct tool runner", async () => {
    const tool = createTool({
      id: "builtin-report-finding",
      name: "Report Finding",
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_finding",
      bashSource: null
    });

    await expect(runAiTool(createRuntime(tool), tool.id, {})).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_BUILTIN_NOT_RUNNABLE"
    });
  });

  it("returns only compact public observations with truncation metadata", async () => {
    const tool = createTool({
      bashSource: [
        "#!/usr/bin/env bash",
        "printf '%s\\n' '{\"output\":\"scan complete\",\"observations\":[",
        "{\"key\":\"admin\",\"title\":\"Admin panel exposed\",\"summary\":\"/admin returned HTTP 200.\",\"severity\":\"medium\",\"confidence\":0.92,\"evidence\":\"GET /admin => 200\",\"technique\":\"HTTP probe\"},",
        "{\"key\":\"miss-1\",\"title\":\"Candidate path missing\",\"summary\":\"/backup returned HTTP 404.\",\"severity\":\"info\",\"confidence\":0.5,\"evidence\":\"GET /backup => 404\",\"technique\":\"Content discovery\"},",
        "{\"key\":\"miss-2\",\"title\":\"Candidate path missing\",\"summary\":\"/old returned HTTP 404.\",\"severity\":\"info\",\"confidence\":0.5,\"evidence\":\"GET /old => 404\",\"technique\":\"Content discovery\"}",
        "]}'"
      ].join("\n")
    });

    const result = await runAiTool(createRuntime(tool), tool.id, { baseUrl: "http://scanner.test" });

    expect(result.totalObservations).toBe(3);
    expect(result.truncated).toBe(true);
    expect(result.observations).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        key: "admin",
        title: "Admin panel exposed",
        summary: "/admin returned HTTP 200."
      }),
      expect.objectContaining({
        key: "aggregate:http-404",
        summary: "2 candidates returned HTTP 404; individual low-signal negatives were compacted."
      })
    ]);
    expect(result.observations[0]).not.toHaveProperty("evidence");
    expect(result.observations[0]).not.toHaveProperty("technique");
  });

  it("runs native auth login probe requests through the local action executor", async () => {
    const server = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
      }
      const params = new URLSearchParams(body);
      const username = params.get("username");
      const password = params.get("password");

      if (password === "password") {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("welcome authenticated");
        return;
      }

      if (username === "admin") {
        response.writeHead(401, { "content-type": "text/plain" });
        response.end("known invalid password");
        return;
      }

      response.writeHead(404, { "content-type": "text/plain" });
      response.end("user missing");
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address");
    }

    const runtime = createToolRuntime(new MemoryAiToolsRepository([]));
    const result = await runAiTool(runtime, "native-auth-login-probe", {
      targetUrl: `http://127.0.0.1:${address.port}`,
      targetKind: "app-base"
    });

    expect(result.exitCode).toBe(0);
    expect(result.target).toBe("127.0.0.1");
    expect(result.observations.map((observation) => observation.key).sort()).toEqual([
      `auth-flow:http://127.0.0.1:${address.port}/login:rate-limit`,
      `auth-flow:http://127.0.0.1:${address.port}/login:weak-password`
    ]);
  });

  it("supports preflight cookies and csrf extraction for native auth login probes", async () => {
    const server = createServer(async (request, response) => {
      if (request.url?.startsWith("/auth/bootstrap")) {
        response.writeHead(200, {
          "content-type": "text/plain",
          "set-cookie": "sessionid=seeded-session; Path=/"
        });
        response.end("csrf=csrf-seed");
        return;
      }

      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
      }
      const parsed = JSON.parse(body || "{}") as Record<string, string>;
      if (request.headers.cookie !== "sessionid=seeded-session" || parsed.csrf !== "csrf-seed") {
        response.writeHead(403, { "content-type": "text/plain" });
        response.end("missing csrf or cookie");
        return;
      }
      if (parsed.password === "password") {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("dashboard-ready");
        return;
      }
      response.writeHead(401, { "content-type": "text/plain" });
      response.end("invalid credentials");
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address");
    }

    const runtime = createToolRuntime(new MemoryAiToolsRepository([]));
    const result = await runAiTool(runtime, "native-auth-login-probe", {
      targetUrl: `http://127.0.0.1:${address.port}/login`,
      targetKind: "login-endpoint",
      requestEncoding: "json",
      preflightRequest: {
        path: "/auth/bootstrap",
        cookieNames: ["sessionid"]
      },
      csrf: {
        source: "body_regex",
        transport: "field",
        name: "csrf",
        pattern: "csrf=([a-z-]+)"
      },
      successBodyStrings: ["dashboard-ready"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.observations.some((observation) => observation.key.endsWith(":weak-password"))).toBe(true);
    expect(result.output).toContain("Ran one preflight request");
  });
});
