import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Observation, Scan, ToolRequest } from "@synosec/contracts";

const mockCreateAuditEntry = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockExecuteAdapter = vi.fn<
  (input: unknown) => Promise<{ observations: Observation[]; output: string; exitCode: number }>
>();

vi.mock("../db/neo4j.js", () => ({
  createAuditEntry: mockCreateAuditEntry
}));

vi.mock("./adapters.js", () => ({
  executeAdapter: mockExecuteAdapter
}));

const { evidenceStore } = await import("./evidence-store.js");
const { confidenceEngine } = await import("./confidence-engine.js");
const { BrokerExecutionError, ToolBroker } = await import("./tool-broker.js");

function makeScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-1",
    scope: {
      targets: ["staging.synosec.local"],
      exclusions: [],
      layers: ["L3", "L4", "L7"],
      maxDepth: 3,
      maxDurationMinutes: 10,
      rateLimitRps: 5,
      allowActiveExploits: false,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "simulation" as const
    },
    status: "running",
    currentRound: 0,
    nodesTotal: 1,
    nodesComplete: 0,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function makeRequest(overrides: Partial<ToolRequest> = {}): ToolRequest {
  return {
    tool: "sqlmap",
    adapter: "db_injection_check",
    target: "staging.synosec.local",
    layer: "L7",
    riskTier: "active",
    justification: "Validate potential SQL injection safely.",
    parameters: {},
    ...overrides
  };
}

describe("ToolBroker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evidenceStore.clear();
  });

  it("produces evidence-backed findings from adapter observations", async () => {
    const registerObservationSpy = vi.spyOn(confidenceEngine, "registerObservation");
    mockExecuteAdapter.mockResolvedValueOnce({
      observations: [
        {
          id: "obs-1",
          scanId: "scan-1",
          nodeId: "node-1",
          toolRunId: "tool-run-1",
          adapter: "db_injection_check",
          target: "staging.synosec.local",
          key: "sqli-1",
          title: "Potential SQL injection detected",
          summary: "sqlmap reported an injectable parameter.",
          severity: "high",
          confidence: 0.91,
          evidence: "parameter is injectable",
          technique: "SQLi probe",
          relatedKeys: [],
          createdAt: new Date().toISOString()
        }
      ],
      output: "sqlmap raw output",
      exitCode: 0
    });

    const broker = new ToolBroker({ broadcast: vi.fn() });

    const result = await broker.executeRequests({
      scan: makeScan({
        scope: {
          ...makeScan().scope,
          allowActiveExploits: true
        }
      }),
      nodeId: "node-1",
      agentId: "l7-application-agent",
      requests: [makeRequest()]
    });

    expect(result.toolRuns).toHaveLength(1);
    expect(result.observations).toHaveLength(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.validationStatus).toBe("single_source");
    expect(result.findings[0]?.evidenceRefs?.length).toBe(1);
    expect(result.toolRuns[0]?.output).toBe("sqlmap raw output");
    expect(registerObservationSpy).toHaveBeenCalledTimes(1);
  });

  it("denies controlled exploit requests when scan policy forbids them", async () => {
    const broker = new ToolBroker({ broadcast: vi.fn() });

    const result = await broker.executeRequests({
      scan: makeScan(),
      nodeId: "node-1",
      agentId: "l7-application-agent",
      requests: [
        makeRequest({
          tool: "ffuf",
          adapter: "content_discovery",
          riskTier: "controlled-exploit"
        })
      ]
    });

    expect(result.toolRuns[0]?.status).toBe("denied");
    expect(result.observations).toHaveLength(0);
    expect(result.findings).toHaveLength(0);
  });

  it("marks tool runs as failed when a real tool execution errors", async () => {
    mockExecuteAdapter.mockRejectedValueOnce(new Error("nmap execution failed: spawn ENOENT"));

    const broker = new ToolBroker({ broadcast: vi.fn() });
    await expect(() =>
      broker.executeRequests({
        scan: makeScan({
          scope: {
            ...makeScan().scope,
            allowActiveExploits: true
          }
        }),
        nodeId: "node-1",
        agentId: "l4-transport-agent",
        requests: [
          makeRequest({
            tool: "nmap",
            adapter: "service_scan",
            layer: "L4"
          })
        ]
      })
    ).rejects.toBeInstanceOf(BrokerExecutionError);

    const [run] = evidenceStore.getToolRunsForScan("scan-1");
    expect(run?.status).toBe("failed");
    expect(run?.statusReason).toContain("ENOENT");
    expect(run?.output).toContain("adapter=service_scan");
  });
});
