import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Scan } from "@synosec/contracts";
import { createApp } from "@/platform/app/create-app.js";
import { MemoryAiProvidersRepository } from "@/features/modules/ai-providers/memory-ai-providers.repository.js";
import { MemoryAiAgentsRepository } from "@/features/modules/ai-agents/memory-ai-agents.repository.js";
import { MemoryAiToolsRepository } from "@/features/modules/ai-tools/memory-ai-tools.repository.js";
import type { ApplicationsRepository } from "@/features/modules/applications/applications.repository.js";
import type { RuntimesRepository } from "@/features/modules/runtimes/runtimes.repository.js";
import { MemoryWorkflowsRepository } from "@/features/modules/workflows/memory-workflows.repository.js";
import { connectorControlPlane } from "@/integrations/connectors/control-plane.js";

const {
  mockCreateAuditEntry,
  mockCreateScan,
  mockGetScan,
  mockExecuteScriptedTool
} = vi.hoisted(() => ({
  mockCreateAuditEntry: vi.fn().mockResolvedValue(undefined),
  mockCreateScan: vi.fn().mockResolvedValue(undefined),
  mockGetScan: vi.fn().mockResolvedValue(null),
  mockExecuteScriptedTool: vi.fn().mockResolvedValue({
    observations: [],
    output: "local tool output",
    exitCode: 0
  })
}));

vi.mock("../../platform/db/scan-store.js", () => ({
  createAuditEntry: mockCreateAuditEntry,
  createScan: mockCreateScan,
  getScan: mockGetScan
}));

vi.mock("../../workflows/tools/script-executor.js", () => ({
  buildScriptCommandPreview: vi.fn(() => "scripts/tools/http-recon.sh"),
  executeScriptedTool: mockExecuteScriptedTool
}));

function createTestApp() {
  const aiProvidersRepository = new MemoryAiProvidersRepository();
  const aiToolsRepository = new MemoryAiToolsRepository();
  const applicationsRepository: ApplicationsRepository = {
    list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
    getById: async () => null,
    create: async () => {
      throw new Error("Not implemented in connector route tests.");
    },
    update: async () => null,
    remove: async () => false
  };
  const runtimesRepository: RuntimesRepository = {
    list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
    getById: async () => null,
    create: async () => {
      throw new Error("Not implemented in connector route tests.");
    },
    update: async () => null,
    remove: async () => false
  };

  const aiAgentsRepository = new MemoryAiAgentsRepository(aiProvidersRepository, aiToolsRepository);

  return createApp({
    applicationsRepository,
    runtimesRepository,
    aiProvidersRepository,
    aiAgentsRepository,
    aiToolsRepository,
    workflowsRepository: new MemoryWorkflowsRepository(applicationsRepository, runtimesRepository, aiAgentsRepository)
  });
}

describe("connector routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectorControlPlane.clear();
    process.env["TOOL_EXECUTION_MODE"] = "local";
    process.env["CONNECTOR_SHARED_TOKEN"] = "synosec-connector-dev";
    mockGetScan.mockResolvedValue(null as Scan | null);
  });

  it("rejects unauthorized status checks", async () => {
    const response = await request(createTestApp()).get("/api/connectors/status");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized connector request." });
  });

  it("registers a connector and reports it in status", async () => {
    const app = createTestApp();

    const registerResponse = await request(app)
      .post("/api/connectors/register")
      .set("Authorization", "Bearer synosec-connector-dev")
      .send({
        name: "test-connector",
        version: "0.1.0",
        allowedCapabilities: ["web-recon"],
        runMode: "dry-run",
        concurrency: 1,
        capabilities: []
      });

    const statusResponse = await request(app)
      .get("/api/connectors/status")
      .set("Authorization", "Bearer synosec-connector-dev");

    expect(registerResponse.status).toBe(201);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.connectors).toHaveLength(1);
    expect(statusResponse.body.connectors[0]?.name).toBe("test-connector");
  });

  it("creates missing scan state before test dispatch", async () => {
    const response = await request(createTestApp())
      .post("/api/connectors/test-dispatch")
      .send({
        scanId: "11111111-1111-4111-8111-111111111111",
        tacticId: "22222222-2222-4222-8222-222222222222",
        agentId: "agent-smoke",
        scope: {
          targets: ["example.com"],
          exclusions: [],
          layers: ["L7"],
          maxDepth: 1,
          maxDurationMinutes: 1,
          rateLimitRps: 1,
          allowActiveExploits: false,
          graceEnabled: true,
          graceRoundInterval: 3,
          cyberRangeMode: "simulation"
        },
        request: {
          toolId: "tool-1",
          tool: "curl",
          scriptPath: "scripts/tools/http-recon.sh",
          capabilities: ["web-recon"],
          target: "example.com",
          layer: "L7",
          riskTier: "passive",
          justification: "connector smoke",
          sandboxProfile: "network-recon",
          privilegeProfile: "read-only-network",
          parameters: {
            scriptPath: "scripts/tools/http-recon.sh",
            scriptArgs: ["-I", "http://example.com"]
          }
        }
      });

    expect(response.status).toBe(202);
    expect(response.body.dispatchMode).toBe("local");
    expect(mockGetScan).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(mockCreateScan).toHaveBeenCalledTimes(1);
    expect(mockCreateScan).toHaveBeenCalledWith(expect.objectContaining({
      id: "11111111-1111-4111-8111-111111111111",
      status: "running"
    }));
  });

  it("reuses existing scan state during test dispatch", async () => {
    mockGetScan.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      scope: {
        targets: ["example.com"],
        exclusions: [],
        layers: ["L7"],
        maxDepth: 1,
        maxDurationMinutes: 1,
        rateLimitRps: 1,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      status: "running",
      currentRound: 0,
      tacticsTotal: 1,
      tacticsComplete: 0,
      createdAt: "2026-04-20T10:00:00.000Z"
    });

    const response = await request(createTestApp())
      .post("/api/connectors/test-dispatch")
      .send({
        scanId: "11111111-1111-4111-8111-111111111111",
        tacticId: "22222222-2222-4222-8222-222222222222",
        agentId: "agent-smoke",
        scope: {
          targets: ["example.com"],
          exclusions: [],
          layers: ["L7"],
          maxDepth: 1,
          maxDurationMinutes: 1,
          rateLimitRps: 1,
          allowActiveExploits: false,
          graceEnabled: true,
          graceRoundInterval: 3,
          cyberRangeMode: "simulation"
        },
        request: {
          toolId: "tool-1",
          tool: "curl",
          scriptPath: "scripts/tools/http-recon.sh",
          capabilities: ["web-recon"],
          target: "example.com",
          layer: "L7",
          riskTier: "passive",
          justification: "connector smoke",
          sandboxProfile: "network-recon",
          privilegeProfile: "read-only-network",
          parameters: {
            scriptPath: "scripts/tools/http-recon.sh",
            scriptArgs: ["-I", "http://example.com"]
          }
        }
      });

    expect(response.status).toBe(202);
    expect(mockCreateScan).not.toHaveBeenCalled();
  });
});
