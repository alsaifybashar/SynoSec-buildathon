import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiAgent, AiProvider, AiTool, Application, Runtime, ScanLlmConfig, SingleAgentScan } from "@synosec/contracts";
import { SingleAgentScanService } from "./single-agent-scan.service.js";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn()
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: generateTextMock
  };
});

const scanStoreState = {
  scan: null as SingleAgentScan | null,
  coverage: [] as Array<Record<string, unknown>>,
  audits: [] as Array<Record<string, unknown>>,
  vulnerabilities: [] as Array<Record<string, unknown>>
};

vi.mock("@/platform/db/scan-store.js", () => ({
  createScan: vi.fn(async (scan: SingleAgentScan, metadata?: Record<string, unknown>) => {
    scanStoreState.scan = {
      ...scan,
      mode: "single-agent",
      applicationId: String(metadata?.["applicationId"] ?? ""),
      runtimeId: metadata?.["runtimeId"] as string | null ?? null,
      agentId: String(metadata?.["agentId"] ?? ""),
      ...(metadata?.["llm"] ? { llm: metadata["llm"] as ScanLlmConfig } : {}),
      stopReason: null
    };
  }),
  createDfsNode: vi.fn(async () => undefined),
  updateNodeStatus: vi.fn(async () => undefined),
  getScan: vi.fn(async (id: string) => (scanStoreState.scan?.id === id ? scanStoreState.scan : null)),
  upsertLayerCoverage: vi.fn(async (coverage: Record<string, unknown>) => {
    scanStoreState.coverage.push(coverage);
  }),
  createAuditEntry: vi.fn(async (entry: Record<string, unknown>) => {
    scanStoreState.audits.push(entry);
  }),
  createSecurityVulnerability: vi.fn(async (_scanId: string, _agentId: string, _tacticId: string, vulnerability: Record<string, unknown>) => {
    scanStoreState.vulnerabilities.push(vulnerability);
  }),
  updateSingleAgentScan: vi.fn(async (id: string, update: Record<string, unknown>) => {
    if (!scanStoreState.scan || scanStoreState.scan.id !== id) {
      return;
    }

    scanStoreState.scan = {
      ...scanStoreState.scan,
      ...(update["status"] ? { status: update["status"] as SingleAgentScan["status"] } : {}),
      ...(update["currentRound"] !== undefined ? { currentRound: Number(update["currentRound"]) } : {}),
      ...(update["tacticsTotal"] !== undefined ? { tacticsTotal: Number(update["tacticsTotal"]) } : {}),
      ...(update["tacticsComplete"] !== undefined ? { tacticsComplete: Number(update["tacticsComplete"]) } : {}),
      ...(update["completedAt"] ? { completedAt: String(update["completedAt"]) } : {}),
      ...(update["stopReason"] !== undefined ? { stopReason: update["stopReason"] as string | null } : {})
    };
  }),
  getSingleAgentScan: vi.fn(async () => scanStoreState.scan)
}));

const application: Application = {
  id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
  name: "Demo App",
  baseUrl: "http://localhost:8888",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const runtime: Runtime = {
  id: "6fd90dd7-6f27-47d0-ab24-6328bb2f3624",
  name: "Demo Runtime",
  serviceType: "api",
  provider: "docker",
  environment: "development",
  region: "local",
  status: "healthy",
  applicationId: application.id,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const localProvider: AiProvider & { apiKey: string | null } = {
  id: "6fb18f09-f230-49df-b0ab-4f1bcedd230c",
  name: "Local",
  kind: "local",
  status: "active",
  description: "Local provider",
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen3:4b",
  apiKeyConfigured: false,
  apiKey: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const anthropicProvider: AiProvider & { apiKey: string | null } = {
  id: "88e995dc-c55d-4a74-b831-b64922f25858",
  name: "Anthropic",
  kind: "anthropic",
  status: "active",
  description: "Anthropic provider",
  baseUrl: null,
  model: "claude-sonnet-4-6",
  apiKeyConfigured: true,
  apiKey: "test-key",
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const agent: AiAgent = {
  id: "fa1a0bfa-6b02-4948-8e1c-155f6b9a4ae7",
  name: "Single Scan Agent",
  status: "active",
  description: "Single agent scan runtime",
  providerId: localProvider.id,
  systemPrompt: "Act as a careful security scanning agent.",
  modelOverride: null,
  toolIds: [],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const serviceScanTool: AiTool = {
  id: "seed-service-scan",
  name: "Service Scan",
  status: "active",
  source: "custom",
  description: "Enumerate exposed ports and identify reachable network services.",
  binary: "node",
  executorType: "bash",
  bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
  capabilities: ["network-recon", "passive"],
  category: "network",
  riskTier: "passive",
  notes: null,
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 30000,
  inputSchema: { type: "object", properties: { target: { type: "string" } } },
  outputSchema: { type: "object", properties: { output: { type: "string" } } },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

function createService(options?: {
  agentOverride?: Partial<AiAgent>;
  toolById?: (id: string) => AiTool | null | Promise<AiTool | null>;
  providerOverride?: AiProvider & { apiKey: string | null };
}) {
  const runtimeAgent: AiAgent = {
    ...agent,
    ...options?.agentOverride
  };
  return new SingleAgentScanService(
    {
      getById: async () => application
    } as never,
    {
      getById: async () => runtime
    } as never,
    {
      getById: async () => runtimeAgent
    } as never,
    {
      getStoredById: async () => options?.providerOverride ?? localProvider
    } as never,
    {
      getById: async (id: string) => options?.toolById ? options.toolById(id) : null
    } as never
  );
}

describe("SingleAgentScanService", () => {
  beforeEach(() => {
    scanStoreState.scan = null;
    scanStoreState.coverage = [];
    scanStoreState.audits = [];
    scanStoreState.vulnerabilities = [];
    vi.restoreAllMocks();
    generateTextMock.mockReset();
  });

  it("creates and completes a local single-agent scan run", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            action: "submit_scan_completion",
            completion: {
              summary: "Completed the scan with explicit coverage bookkeeping.",
              residualRisk: "Layers without tool support remain not covered.",
              recommendedNextStep: "Add more layer-specific adapters before claiming full-stack coverage.",
              stopReason: "no_further_material_progress"
            }
          })
        }
      })
    })));

    const service = createService();
    const result = await service.createAndRunScan({
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1", "L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      llm: {
        provider: "local",
        model: "qwen3:4b",
        baseUrl: "http://127.0.0.1:11434"
      }
    });

    expect(result.mode).toBe("single-agent");
    expect(result.status).toBe("complete");
    expect(result.stopReason).toBe("no_further_material_progress");
    expect(scanStoreState.coverage).toHaveLength(3);
    expect(scanStoreState.audits.some((entry) => entry["action"] === "single-agent-scan-completed")).toBe(true);
  });

  it("sends the local model a structured system prompt and non-empty task prompt", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            action: "submit_scan_completion",
            completion: {
              summary: "Completed the scan with explicit coverage bookkeeping.",
              residualRisk: "Layers without tool support remain not covered.",
              recommendedNextStep: "Add more layer-specific adapters before claiming full-stack coverage.",
              stopReason: "no_further_material_progress"
            }
          })
        }
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const service = createService({
      agentOverride: {
        toolIds: [serviceScanTool.id]
      },
      toolById: async (id) => (id === serviceScanTool.id ? serviceScanTool : null)
    });

    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000010",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1", "L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      }
    });

    expect(fetchMock).toHaveBeenCalled();
    const firstCall = fetchMock.mock.calls[0] as [unknown, RequestInit?] | undefined;
    const firstRequestInit = firstCall?.[1];
    const requestBody = JSON.parse(String(firstRequestInit?.body ?? "{}")) as {
      messages?: Array<{ role: string; content: string }>;
    };
    expect(requestBody.messages?.[0]?.content).toContain("You are running in structured JSON action mode.");
    expect(requestBody.messages?.[0]?.content).toContain('{"action":"call_tool","toolId":"string","input":{...},"reasoning":"string"}');
    expect(requestBody.messages?.[0]?.content).toContain("Target application: Demo App");
    expect(requestBody.messages?.[0]?.content).toContain("Target URL: http://localhost:8888");
    expect(requestBody.messages?.[0]?.content).toContain("Allowed tools: seed-service-scan=Service Scan");
    expect(requestBody.messages?.[0]?.content).toContain("Requested layers: L1, L4, L7");
    expect(requestBody.messages?.[1]?.content).toContain("Max duration minutes: 5");
    expect(requestBody.messages?.[1]?.content).toContain("Start with the next highest-value evidence action.");
  });

  it("emits persisted workflow debug events for workflow-linked local runs", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            action: "submit_scan_completion",
            reasoning: "No higher-value action remains after reviewing the current scope.",
            completion: {
              summary: "Completed the scan with explicit coverage bookkeeping.",
              residualRisk: "Layers without tool support remain not covered.",
              recommendedNextStep: "Add more layer-specific adapters before claiming full-stack coverage.",
              stopReason: "no_further_material_progress"
            }
          })
        }
      })
    })));

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService();
    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000001",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    });

    expect(workflowEvents.some((event) => event["type"] === "system_message" && event["title"] === "Rendered system prompt")).toBe(true);
    expect(workflowEvents.some((event) =>
      event["type"] === "system_message"
      && event["title"] === "Rendered system prompt"
      && String(event["detail"]).includes(agent.systemPrompt)
    )).toBe(true);
    expect(workflowEvents.some((event) =>
      event["type"] === "system_message"
      && event["title"] === "Rendered task prompt"
      && String(event["detail"]).includes("Start with the next highest-value evidence action.")
    )).toBe(true);
    expect(workflowEvents.some((event) => event["type"] === "model_decision")).toBe(true);
    expect(workflowEvents.some((event) => event["type"] === "verification" && event["title"] === "Verifier accepted the scan closeout")).toBe(true);
    expect(workflowEvents.some((event) => event["type"] === "agent_summary")).toBe(true);
  });

  it("rethrows workflow-linked failures after persisting the failed scan state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("local provider unavailable");
    }));

    const service = createService();

    await expect(service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000001",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      }
    })).rejects.toThrow("local provider unavailable");

    expect(scanStoreState.scan?.status).toBe("failed");
    expect(scanStoreState.scan?.stopReason).toBe("local provider unavailable");
    expect(scanStoreState.audits.some((entry) => entry["action"] === "single-agent-scan-failed")).toBe(true);
  });

  it("includes local provider request diagnostics in workflow failure events", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService();

    await expect(service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000011",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    })).rejects.toThrow(/local provider request failed/i);

    expect(workflowEvents.some((event) =>
      event["type"] === "stage_failed"
      && String(event["summary"]).toLowerCase().includes("local provider request failed")
      && String(event["detail"]).includes("http://127.0.0.1:11434/api/chat")
    )).toBe(true);
  });

  it("does not upgrade coverage when a completed tool run produces no observations", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "call_tool",
              toolId: "seed-service-scan",
              input: {
                target: "http://localhost:8888/"
              },
              reasoning: "Check TCP reachability first."
            })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              completion: {
                summary: "Stopped after insufficient evidence from the initial tool.",
                residualRisk: "Service reachability is still not established.",
                recommendedNextStep: "Retry with a corrected or alternative probe.",
                stopReason: "insufficient_evidence"
              }
            })
          }
        })
      }));

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService({
      agentOverride: {
        toolIds: ["seed-service-scan"]
      },
      toolById: async (id) => (id === "seed-service-scan" ? serviceScanTool : null)
    });

    (service as unknown as { broker: { executeRequests: (input: unknown) => Promise<unknown> } }).broker.executeRequests = async () => ({
      toolRuns: [{
        id: "tool-run-1",
        scanId: "70000000-0000-0000-0000-000000000001",
        tacticId: "tactic-1",
        agentId: agent.id,
        toolId: "seed-service-scan",
        tool: "Service Scan",
        executorType: "bash",
        capabilities: ["network-recon"],
        target: "localhost",
        port: 8888,
        status: "completed",
        riskTier: "passive",
        justification: "test",
        commandPreview: "seed-service-scan target=localhost baseUrl=http://localhost:8888",
        dispatchMode: "local",
        startedAt: "2026-04-21T00:00:00.000Z",
        completedAt: "2026-04-21T00:00:01.000Z",
        output: "no observations"
      }],
      observations: [],
      findings: []
    });

    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000001",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L4"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    });

    expect(scanStoreState.coverage.some((entry) => entry["layer"] === "L4" && entry["coverageStatus"] === "partially_covered")).toBe(false);
    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["summary"] === "Service Scan completed but produced no persisted observations, so L4 remains unsupported by evidence."
    )).toBe(true);
  });

  it("keeps the agent-authored layer on tool execution and challenges weak OSI reasoning separately", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "call_tool",
              toolId: "seed-service-scan",
              input: {
                target: "http://localhost:8888/",
                layer: "L1"
              },
              reasoning: "Start with L1 (Network Layer) using service scan."
            })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              completion: {
                summary: "Stopped after the initial probe and verifier feedback.",
                residualRisk: "Layer attribution remains tentative and broader coverage is still missing.",
                recommendedNextStep: "Refine the layer reasoning and continue evidence collection.",
                stopReason: "prompt_iteration"
              }
            })
          }
        })
      }));

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService({
      agentOverride: {
        toolIds: ["seed-service-scan"]
      },
      toolById: async (id) => (id === "seed-service-scan" ? serviceScanTool : null)
    });

    (service as unknown as { broker: { executeRequests: (input: { requests: Array<Record<string, unknown>> }) => Promise<unknown> } }).broker.executeRequests =
      async (input) => ({
        toolRuns: [{
          id: "tool-run-osi-1",
          scanId: "70000000-0000-0000-0000-000000000012",
          tacticId: "tactic-1",
          agentId: agent.id,
          toolId: "seed-service-scan",
          tool: "Service Scan",
          executorType: "bash",
          capabilities: ["network-recon"],
          target: String(input.requests[0]?.["target"] ?? "localhost"),
          port: Number(input.requests[0]?.["port"] ?? 8888),
          status: "completed",
          riskTier: "passive",
          justification: "test",
          commandPreview: "seed-service-scan target=localhost baseUrl=http://localhost:8888",
          dispatchMode: "local",
          startedAt: "2026-04-21T00:00:00.000Z",
          completedAt: "2026-04-21T00:00:01.000Z",
          output: "localhost:8888 open"
        }],
        observations: [{
          id: "obs-osi-1",
          scanId: "70000000-0000-0000-0000-000000000012",
          tacticId: "tactic-1",
          target: "localhost:8888",
          layer: "L1",
          kind: "service_exposure",
          summary: "Confirmed TCP connectivity to localhost:8888.",
          confidence: 0.84,
          evidence: "TCP connection succeeded.",
          sourceTool: "seed-service-scan",
          createdAt: "2026-04-21T00:00:01.000Z"
        }],
        findings: []
      });

    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000012",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    });

    expect(workflowEvents.some((event) =>
      event["type"] === "tool_call"
      && event["payload"]
      && typeof event["payload"] === "object"
      && (event["payload"] as Record<string, unknown>)["request"]
      && typeof (event["payload"] as Record<string, unknown>)["request"] === "object"
      && ((event["payload"] as Record<string, unknown>)["request"] as Record<string, unknown>)["layer"] === "L1"
    )).toBe(true);
    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["title"] === "Verifier challenged the OSI layer reasoning"
      && String(event["summary"]).includes("L1 (Network Layer)")
    )).toBe(true);
    expect(scanStoreState.coverage.some((entry) => entry["layer"] === "L1" && entry["coverageStatus"] === "partially_covered")).toBe(true);
  });

  it("rejects llm overrides that change provider kind", async () => {
    const service = createService();

    await expect(service.createAndRunScan({
      applicationId: application.id,
      runtimeId: null,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      llm: {
        provider: "anthropic"
      }
    })).rejects.toThrow("LLM override provider must match the selected agent provider.");
  });

  it("retries invalid closeout payloads instead of failing the run immediately", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              reasoning: "I am done.",
              completion: {
                summary: "Incomplete closeout"
              }
            })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              reasoning: "No additional evidence can be gathered with the approved tools.",
              completion: {
                summary: "Completed after verifier-guided closeout correction.",
                residualRisk: "Layers without direct tooling remain partially assessed.",
                recommendedNextStep: "Add more layer-specific tooling before broadening coverage claims.",
                stopReason: "no_further_material_progress"
              }
            })
          }
        })
      }));

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService();
    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000099",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    });

    expect(scanStoreState.scan?.status).toBe("complete");
    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["title"] === "Verifier rejected the scan closeout"
      && String(event["summary"]).includes("residualRisk")
    )).toBe(true);
    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["title"] === "Verifier accepted the scan closeout"
    )).toBe(true);
  });

  it("rejects closeout claims that overstate cross-layer coverage", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              reasoning: "All layers are covered now.",
              completion: {
                summary: "All requested layers (L1-L7) are covered with concrete evidence.",
                residualRisk: "No residual risk remains.",
                recommendedNextStep: "No next step required.",
                stopReason: "coverage_complete"
              }
            })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              reasoning: "Only web-layer evidence is currently supported.",
              completion: {
                summary: "Completed after documenting partial coverage and residual gaps.",
                residualRisk: "Requested layers without direct evidence remain not covered.",
                recommendedNextStep: "Add adapters for unsupported layers before claiming broad OSI coverage.",
                stopReason: "no_further_material_progress"
              }
            })
          }
        })
      }));

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService();
    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000100",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    });

    expect(scanStoreState.scan?.status).toBe("complete");
    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["title"] === "Verifier rejected the scan closeout"
      && String(event["summary"]).includes("coverage claim")
    )).toBe(true);
  });

  it("retries unsupported model actions with explicit supported-action feedback", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              osilayer: "L7",
              evidenceaction: "target/baseUrl/layer",
              rationale: "Targeting the application layer first."
            })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_scan_completion",
              completion: {
                summary: "Completed after retrying with a supported action.",
                residualRisk: "Requested layers without direct evidence remain not covered.",
                recommendedNextStep: "Use approved evidence tools before claiming broader coverage.",
                stopReason: "no_further_material_progress"
              }
            })
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService();
    await service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000101",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    });

    expect(scanStoreState.scan?.status).toBe("complete");
    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["title"] === "Verifier rejected the model action"
      && String(event["summary"]).includes("Unsupported action <missing>")
    )).toBe(true);

    const secondCall = fetchMock.mock.calls[1] as [unknown, RequestInit?] | undefined;
    const secondRequestInit = secondCall?.[1];
    const secondRequestBody = JSON.parse(String(secondRequestInit?.body ?? "{}")) as {
      messages?: Array<{ role: string; content: string }>;
    };
    expect(secondRequestBody.messages?.at(-1)?.content).toContain("Unsupported action <missing>.");
    expect(secondRequestBody.messages?.at(-1)?.content).toContain("Supported actions:");
    expect(secondRequestBody.messages?.at(-1)?.content).toContain("call_tool");
    expect(secondRequestBody.messages?.at(-1)?.content).toContain("submit_scan_completion");
  });

  it("fails hosted runs loudly when the model ends without submit_scan_completion after verifier retries", async () => {
    generateTextMock.mockResolvedValue({
      text: "Acknowledged — revising the summary to match persisted coverage exactly.",
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 }
    });

    const workflowEvents: Array<Record<string, unknown>> = [];
    const service = createService({
      providerOverride: anthropicProvider,
      agentOverride: {
        providerId: anthropicProvider.id
      }
    });

    await expect(service.runWorkflowLinkedScan({
      runId: "70000000-0000-0000-0000-000000000102",
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: agent.id,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      onWorkflowEvent: async (event) => {
        workflowEvents.push(event as Record<string, unknown>);
      }
    })).rejects.toThrow("Hosted model did not submit a completion payload.");

    expect(workflowEvents.some((event) =>
      event["type"] === "verification"
      && event["status"] === "failed"
      && event["title"] === "Verifier rejected the hosted-model closeout"
      && String(event["detail"]).includes("Acknowledged")
    )).toBe(true);
    expect(workflowEvents.some((event) =>
      event["type"] === "model_decision"
      && event["title"] === "Agent completed hosted-model reasoning"
    )).toBe(false);
  });
});
