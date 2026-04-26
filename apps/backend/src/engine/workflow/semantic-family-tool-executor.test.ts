import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AiTool, Scan, ToolRun } from "@synosec/contracts";
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

async function executeDirectSeededTool(input: {
  broker: ToolBroker;
  runtime: ReturnType<typeof createToolRuntime>;
  tool: AiTool;
  rawInput: Record<string, string | number | boolean | string[]>;
}) {
  const configuredBaseUrl = typeof input.rawInput.baseUrl === "string" ? input.rawInput.baseUrl : null;
  const parsedBaseUrl = configuredBaseUrl ? new URL(configuredBaseUrl) : null;
  const target = typeof input.rawInput.target === "string" && input.rawInput.target.length > 0
    ? input.rawInput.target
    : parsedBaseUrl?.hostname ?? "127.0.0.1";
  const port = parsedBaseUrl?.port ? Number(parsedBaseUrl.port) : undefined;
  const request = await input.runtime.compile(input.tool.id, {
    target,
    layer: "L7",
    justification: `Direct comparison run for ${input.tool.name}.`,
    ...(port === undefined ? {} : { port }),
    toolInput: input.rawInput
  });

  const brokerResult = await input.broker.executeRequests({
    scan,
    tacticId: "tactic-direct",
    agentId: "agent-direct",
    requests: [request],
    toolLookup: {
      [input.tool.id]: input.tool
    }
  });

  const toolRun = brokerResult.toolRuns[0];
  if (!toolRun) {
    throw new Error(`Missing direct tool run for ${input.tool.name}`);
  }

  return {
    request,
    toolRun,
    observations: brokerResult.observations
  };
}

function comparableToolRunShape(toolRun: ToolRun) {
  return {
    status: toolRun.status,
    output: toolRun.output ?? null,
    exitCode: toolRun.exitCode ?? null,
    statusReason: toolRun.statusReason ?? null,
    target: toolRun.target,
    port: toolRun.port ?? null
  };
}

function comparableObservationShape(observation: Awaited<ReturnType<typeof executeDirectSeededTool>>["observations"][number]) {
  return {
    toolId: observation.toolId ?? null,
    tool: observation.tool,
    target: observation.target,
    key: observation.key,
    title: observation.title,
    summary: observation.summary,
    severity: observation.severity,
    confidence: observation.confidence,
    evidence: observation.evidence,
    technique: observation.technique,
    relatedKeys: observation.relatedKeys
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
    expect(familyDefinition.candidateToolIds).toContain(execution.response.usedToolId);
    expect(execution.response.status).toBe("completed");
    expect(execution.result.observations.length).toBeGreaterThan(0);
    expect(execution.result.fullOutput.length).toBeGreaterThan(0);
  });

  it("targets the same host and preserves the same evidence as the delegated bash tool", async () => {
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
    const rawInput = {
      target: "127.0.0.1",
      baseUrl
    };

    const family = await executeSemanticFamilyTool({
      broker,
      toolRuntime: runtime,
      familyTool,
      familyDefinition,
      target: {
        baseUrl,
        host: "127.0.0.1"
      },
      scan,
      tacticId: "tactic-family-compare",
      agentId: "agent-family-compare"
    }, rawInput);

    const directTool = createSeededTool(family.response.usedToolId);
    const direct = await executeDirectSeededTool({
      broker,
      runtime,
      tool: directTool,
      rawInput
    });

    expect(family.response.usedToolId).toBe(directTool.id);
    expect(family.result.toolRequest.target).toBe(direct.request.target);
    expect(family.result.toolRequest.port ?? null).toBe(direct.request.port ?? null);
    expect(family.result.toolRequest.parameters.toolInput).toEqual(direct.request.parameters.toolInput);
    expect(comparableToolRunShape(family.result.toolRun)).toEqual(comparableToolRunShape(direct.toolRun));
    expect(family.result.fullOutput).toBe(direct.toolRun.output ?? direct.toolRun.statusReason ?? "");
    expect(family.result.observations.map(comparableObservationShape)).toEqual(direct.observations.map(comparableObservationShape));
    expect(family.result.observationKeys).toEqual(direct.observations.map((observation) => observation.key));
    expect(family.result.observationSummaries).toEqual(direct.observations.map((observation) => observation.summary));
    expect(family.response.outputPreview).toBe(direct.observations[0]?.summary ?? family.result.outputPreview);
    expect(family.response.fallbackUsed).toBe(family.response.attempts.length > 1);
    expect(family.response.attempts.at(-1)?.selected).toBe(true);
  });
});
