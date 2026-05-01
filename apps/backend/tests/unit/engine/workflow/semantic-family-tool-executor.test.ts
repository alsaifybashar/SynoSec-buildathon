import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Scan } from "@synosec/contracts";
import { getBuiltinAiTool } from "@/modules/ai-tools/builtin-ai-tools.js";
import { createToolRuntime, getSemanticFamilyDefinition } from "@/modules/ai-tools/index.js";
import { builtinNativeAiTools } from "@/modules/ai-tools/native-tools/index.js";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import { ToolBroker } from "@/engine/workflow/broker/tool-broker.js";
import { executeSemanticFamilyTool } from "@/engine/workflow/semantic-family-tool-executor.js";

const { createAuditEntryMock } = vi.hoisted(() => ({
  createAuditEntryMock: vi.fn(async () => undefined)
}));

vi.mock("@/engine/scans/index.js", () => ({
  createAuditEntry: createAuditEntryMock
}));

let server: http.Server;
let baseUrl: string;

const scan: Scan = {
  id: "scan-semantic-family",
  scope: {
    targets: ["127.0.0.1"],
    exclusions: [],
    trustZones: [],
    connectivity: [],
    layers: ["L7"],
    maxDepth: 2,
    maxDurationMinutes: 10,
    rateLimitRps: 5,
    allowActiveExploits: false,
    cyberRangeMode: "live"
  },
  status: "running",
  currentRound: 0,
  tacticsTotal: 1,
  tacticsComplete: 0,
  createdAt: "2026-04-30T00:00:00.000Z"
};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/login" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body><form method=\"post\"><input name=\"username\" /><input name=\"password\" /></form></body></html>");
      return;
    }

    if (req.url === "/login" && req.method === "POST") {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        if (body.includes("username=admin") && body.includes("password=password")) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<html><body>Welcome admin</body></html>");
          return;
        }

        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body>Invalid credentials</body></html>");
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
      baseUrl = `http://127.0.0.1:${address.port}`;
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

describe("executeSemanticFamilyTool", () => {
  it("runs auth flow assessment through the native auth flow probe", async () => {
    const familyTool = getBuiltinAiTool("builtin-auth-flow-assessment");
    const familyDefinition = getSemanticFamilyDefinition("auth_flow_assessment");
    if (!familyTool || !familyDefinition) {
      throw new Error("Missing auth flow assessment definitions");
    }

    const runtime = createToolRuntime(new MemoryAiToolsRepository(builtinNativeAiTools));
    const broker = new ToolBroker({ broadcast: () => undefined });

    const execution = await executeSemanticFamilyTool({
      broker,
      toolRuntime: runtime,
      familyTool,
      familyDefinition,
      target: {
        baseUrl,
        host: "127.0.0.1"
      },
      scan,
      tacticId: "tactic-family",
      agentId: "agent-family"
    }, {
      target: "127.0.0.1",
      loginUrl: `${baseUrl}/login`,
      knownUser: "admin"
    });

    expect(execution.result.status).toBe("completed");
    expect(execution.result.usedToolId).toBe("native-auth-flow-probe");
    expect(execution.response.id).toBe(execution.result.toolRun.id);
    expect(execution.result.observations.length).toBeGreaterThan(0);
    expect(execution.result.outputPreview).toContain("weak password");
  });
});
