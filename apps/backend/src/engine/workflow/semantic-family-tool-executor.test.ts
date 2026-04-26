import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AiTool, Scan } from "@synosec/contracts";
import { createToolRuntime, getSemanticFamilyDefinition } from "@/modules/ai-tools/index.js";
import { getBuiltinAiTool } from "@/modules/ai-tools/builtin-ai-tools.js";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";
import { ToolBroker } from "./broker/tool-broker.js";
import { executeSemanticFamilyTool } from "./semantic-family-tool-executor.js";

const { createAuditEntryMock } = vi.hoisted(() => ({
  createAuditEntryMock: vi.fn(async () => undefined)
}));

vi.mock("@/engine/scans/index.js", () => ({
  createAuditEntry: createAuditEntryMock
}));

let server: http.Server;
let baseUrl: string;

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
    createdAt: "2026-04-26T00:00:00.000Z",
    updatedAt: "2026-04-26T00:00:00.000Z"
  };
}

const scan: Scan = {
  id: "scan-semantic-family",
  scope: {
    targets: ["127.0.0.1"],
    exclusions: [],
    trustZones: [],
    connectivity: [],
    layers: ["L4", "L7"],
    maxDepth: 3,
    maxDurationMinutes: 15,
    rateLimitRps: 5,
    allowActiveExploits: false,
    graceEnabled: true,
    graceRoundInterval: 3,
    cyberRangeMode: "live"
  },
  status: "running",
  currentRound: 0,
  tacticsTotal: 1,
  tacticsComplete: 0,
  createdAt: "2026-04-26T00:00:00.000Z"
};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.setHeader("Server", "Apache/2.4.58");
    res.setHeader("X-Powered-By", "PHP/8.2");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<html><head><title>Semantic Family Test</title></head><body>ok</body></html>");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to bind test server");
      }
      baseUrl = `http://127.0.0.1:${address.port}/`;
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
  it("runs a semantic family builtin through seeded tool candidates and returns normalized evidence", async () => {
    const familyTool = getBuiltinAiTool("builtin-http-surface-assessment");
    const familyDefinition = getSemanticFamilyDefinition("http_surface_assessment");

    if (!familyTool || !familyDefinition) {
      throw new Error("Missing builtin semantic family tool definition");
    }

    const runtime = createToolRuntime(new MemoryAiToolsRepository([
      createSeededTool("seed-http-recon"),
      createSeededTool("seed-httpx"),
      createSeededTool("seed-http-headers"),
      createSeededTool("seed-whatweb")
    ]));
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
      baseUrl
    });

    expect(execution.response.toolId).toBe("builtin-http-surface-assessment");
    expect(execution.response.toolName).toBe("http_surface_assessment");
    expect(execution.response.usedToolId).toBe("seed-http-recon");
    expect(execution.response.status).toBe("completed");
    expect(execution.result.observations.length).toBeGreaterThan(0);
    expect(execution.result.fullOutput).toContain("Semantic Family Test");
  });
});
