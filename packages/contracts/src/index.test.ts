import { describe, expect, it } from "vitest";
import {
  connectorPollResponseSchema,
  connectorRegistrationRequestSchema,
  connectorTestDispatchRequestSchema,
  createAiAgentBodySchema,
  createAiToolBodySchema,
  createTargetBodySchema,
  defensiveIterationRecordSchema,
  defensiveLoopContract,
  defensiveLoopStages,
  executeDefensiveIteration,
  executionReportDetailSchema,
  executionReportsListQuerySchema,
  prioritizeDefensiveAction,
  healthResponseSchema,
  listTargetsResponseSchema,
  scanLayerCoverageSchema,
  securityVulnerabilitySchema,
  aiToolSchema,
  targetSchema,
  targetsListQuerySchema,
  toolRequestSchema,
  toolRunSchema,
  workflowFindingSubmissionSchema,
  updateTargetBodySchema
} from "./index.js";
import { workflowTraceEventSchema } from "./index.js";

describe("contracts", () => {
  it("accepts a valid health payload", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      service: "synosec-backend",
      timestamp: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid target payload", () => {
    const result = targetSchema.safeParse({
      id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      name: "Operator Portal",
      baseUrl: "https://portal.synosec.local",
      environment: "production",
      status: "active",
      lastScannedAt: "2026-04-12T12:00:00.000Z",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("applies defaults for target list queries", () => {
    const result = targetsListQuerySchema.safeParse({});

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(25);
      expect(result.data.sortDirection).toBe("asc");
    }
  });

  it("rejects invalid page sizes for list queries", () => {
    const result = targetsListQuerySchema.safeParse({ pageSize: 15 });

    expect(result.success).toBe(false);
  });

  it("accepts paginated target responses", () => {
    const result = listTargetsResponseSchema.safeParse({
      targets: [
        {
          id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
          name: "Operator Portal",
          baseUrl: "https://portal.synosec.local",
          environment: "production",
          status: "active",
          lastScannedAt: "2026-04-12T12:00:00.000Z",
          createdAt: "2026-04-12T12:00:00.000Z",
          updatedAt: "2026-04-12T12:00:00.000Z"
        }
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1
    });

    expect(result.success).toBe(true);
  });

  it("normalizes empty create payload values", () => {
    const result = createTargetBodySchema.safeParse({
      name: "Report Builder",
      baseUrl: "",
      environment: "staging",
      status: "investigating",
      lastScannedAt: null
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.baseUrl).toBeNull();
    }
  });

  it("rejects an empty update payload", () => {
    const result = updateTargetBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts AI agent create bodies without provider overrides", () => {
    const result = createAiAgentBodySchema.safeParse({
      name: "Recon Agent",
      status: "active",
      description: "Handles reconnaissance",
      systemPrompt: "Investigate the target.",
      toolIds: ["httpx"]
    });

    expect(result.success).toBe(true);
  });

  it("accepts connector registration payloads", () => {
    const result = connectorRegistrationRequestSchema.safeParse({
      name: "local-connector",
      version: "0.1.0",
      allowedCapabilities: ["web-recon", "network-recon"],
      runMode: "dry-run",
      concurrency: 1,
      capabilities: [{ key: "hostname", value: "vps-01" }]
    });

    expect(result.success).toBe(true);
  });

  it("accepts workflow trace events for system and verification lanes", () => {
    const systemEvent = workflowTraceEventSchema.safeParse({
      id: "8ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowId: "6ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowStageId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      stepIndex: 0,
      ord: 1,
      type: "system_message",
      status: "completed",
      title: "Rendered system prompt",
      summary: "Persisted the system prompt.",
      detail: "full prompt",
      payload: {
        lane: "system",
        messageKind: "prompt"
      },
      createdAt: "2026-04-21T12:00:00.000Z"
    });

    const verificationEvent = workflowTraceEventSchema.safeParse({
      id: "9ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowId: "6ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowStageId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      stepIndex: 0,
      ord: 2,
      type: "verification",
      status: "completed",
      title: "Verifier accepted the scan closeout",
      summary: "Closeout was accepted.",
      detail: null,
      payload: {
        lane: "verification",
        messageKind: "accept"
      },
      createdAt: "2026-04-21T12:00:01.000Z"
    });

    expect(systemEvent.success).toBe(true);
    expect(verificationEvent.success).toBe(true);
  });

  it("accepts connector poll responses with leased tool runs", () => {
    const result = connectorPollResponseSchema.safeParse({
      connectorId: "connector-1",
      job: {
        id: "job-1",
        connectorId: "connector-1",
        scanId: "scan-1",
        tacticId: "tactic-1",
        agentId: "agent-1",
        mode: "dry-run",
        createdAt: "2026-04-20T12:00:00.000Z",
        leasedAt: "2026-04-20T12:00:00.000Z",
        leaseExpiresAt: "2026-04-20T12:00:15.000Z",
        toolRun: {
          id: "tool-run-1",
          scanId: "scan-1",
          tacticId: "tactic-1",
          agentId: "agent-1",
          tool: "curl",
          toolId: "tool-1",
          executorType: "bash",
          capabilities: ["web-recon"],
          target: "example.com",
          status: "running",
          riskTier: "passive",
          justification: "Check HTTP headers.",
          commandPreview: "curl -I http://example.com",
          dispatchMode: "connector",
          connectorId: "connector-1",
          startedAt: "2026-04-20T12:00:00.000Z",
          leasedAt: "2026-04-20T12:00:00.000Z",
          leaseExpiresAt: "2026-04-20T12:00:15.000Z"
        },
        request: {
          toolId: "tool-1",
          tool: "curl",
          executorType: "bash",
          capabilities: ["web-recon"],
          target: "example.com",
          layer: "L7",
          riskTier: "passive",
          justification: "Check HTTP headers.",
          sandboxProfile: "network-recon",
          privilegeProfile: "read-only-network",
          parameters: {
            bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
            commandPreview: "curl -I http://example.com",
            toolInput: { baseUrl: "http://example.com", target: "example.com" }
          }
        }
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts a structured security vulnerability with layer metadata", () => {
    const result = securityVulnerabilitySchema.safeParse({
      id: "vuln-1",
      scanId: "scan-1",
      agentId: "agent-1",
      primaryLayer: "L7",
      relatedLayers: ["L6"],
      category: "auth_weakness",
      title: "Weak session token handling",
      description: "Session tokens are long-lived and not rotated on privilege change.",
      impact: "Compromised sessions could remain valid longer than intended.",
      recommendation: "Rotate tokens on login and privilege change.",
      severity: "medium",
      confidence: 0.82,
      validationStatus: "single_source",
      target: {
        host: "localhost",
        url: "http://localhost:8888/account"
      },
      evidence: [
        {
          sourceTool: "seed-http-recon",
          quote: "Set-Cookie response lacks rotation semantics.",
          toolRunRef: "tool-run-1"
        }
      ],
      technique: "HTTP session analysis",
      tags: ["session", "auth"],
      createdAt: "2026-04-21T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("accepts workflow finding submissions with inline graph relationship metadata and linked evidence", () => {
    const result = workflowFindingSubmissionSchema.safeParse({
      type: "auth_weakness",
      title: "Admin surface exposed",
      severity: "high",
      confidence: 0.92,
      target: {
        host: "target.local",
        url: "https://target.local/admin"
      },
      evidence: [
        {
          sourceTool: "httpx",
          quote: "GET /admin returned 200",
          toolRunRef: "tool-run-1"
        }
      ],
      impact: "An administrative entrypoint is reachable without the expected front-door controls.",
      recommendation: "Restrict access to the admin surface.",
      derivedFromFindingIds: ["11111111-1111-4111-8111-111111111111"],
      relatedFindingIds: ["22222222-2222-4222-8222-222222222222"],
      enablesFindingIds: ["33333333-3333-4333-8333-333333333333"],
      chain: {
        id: "admin-path",
        title: "Admin exposure path",
        summary: "This finding contributes to a broader privilege escalation chain.",
        severity: "high"
      },
      tags: ["admin"]
    });

    expect(result.success).toBe(true);
  });

  it("accepts scan layer coverage for L1 through L7 values", () => {
    const result = scanLayerCoverageSchema.safeParse({
      scanId: "scan-1",
      layer: "L1",
      coverageStatus: "not_covered",
      confidenceSummary: "No physical-layer evidence path was available in the local demo.",
      toolRefs: [],
      evidenceRefs: [],
      vulnerabilityIds: [],
      gaps: ["No L1 adapter configured."],
      updatedAt: "2026-04-21T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("accepts execution report detail payloads", () => {
    const result = executionReportDetailSchema.safeParse({
      id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      executionId: "run-1",
      executionKind: "workflow",
      sourceDefinitionId: "11111111-1111-4111-8111-111111111111",
      status: "completed",
      title: "Workflow run",
      targetLabel: "https://target.local",
      sourceLabel: "Workflow",
      findingsCount: 1,
      highestSeverity: "high",
      generatedAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T12:05:00.000Z",
      archivedAt: null,
      executiveSummary: "One meaningful attack path was confirmed.",
      graph: {
        nodes: [
          {
            id: "evidence-1",
            kind: "evidence",
            title: "Admin panel response",
            summary: "Passive HTTP evidence showing an admin surface.",
            sourceTool: "httpx",
            quote: "/admin returned 200 OK",
            severity: "high",
            refs: [{ toolRunRef: "tool-run-1" }],
            createdAt: "2026-04-25T12:02:00.000Z"
          },
          {
            id: "finding-1",
            kind: "finding",
            findingId: "finding-1",
            title: "Admin surface exposed",
            summary: "The attack map confirmed an exposed admin surface.",
            severity: "high",
            confidence: null,
            targetLabel: "https://target.local/admin",
            createdAt: "2026-04-25T12:03:00.000Z"
          }
        ],
        edges: [
          {
            id: "edge-1",
            kind: "supports",
            source: "evidence-1",
            target: "finding-1",
            createdAt: "2026-04-25T12:03:30.000Z"
          }
        ]
      },
      findings: [
        {
          id: "finding-1",
          executionId: "run-1",
          executionKind: "workflow",
          source: "workflow-finding",
          severity: "high",
          title: "Admin surface exposed",
          type: "phase-finding",
          summary: "The attack map confirmed an exposed admin surface.",
          recommendation: null,
          confidence: null,
          validationStatus: undefined,
          explanationSummary: null,
          confidenceReason: null,
          targetLabel: "https://target.local/admin",
          derivedFromFindingIds: [],
          relatedFindingIds: [],
          enablesFindingIds: [],
          relationshipExplanations: null,
          chain: null,
          reproduction: null,
          evidence: [],
          sourceToolIds: ["tool-httpx"],
          sourceToolRunIds: ["tool-run-1"],
          createdAt: "2026-04-25T12:03:00.000Z"
        }
      ],
      toolActivity: [],
      coverageOverview: {},
      sourceSummary: {
        executionKind: "workflow",
        runId: "11111111-1111-4111-8111-111111111111",
        workflowId: "22222222-2222-4222-8222-222222222222",
        stopReason: null,
        totalFindings: 1,
        topFindingIds: ["finding-1"]
      },
      raw: {}
    });

    expect(result.success).toBe(true);
  });

  it("applies defaults for execution report list queries", () => {
    const result = executionReportsListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe("generatedAt");
      expect(result.data.sortDirection).toBe("desc");
      expect(result.data.archived).toBe("exclude");
    }
  });

  it("requires UUID scan and tactic ids for connector test dispatch", () => {
    const result = connectorTestDispatchRequestSchema.safeParse({
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
        tool: "curl",
        capabilities: ["web-recon"],
        target: "example.com",
        layer: "L7",
        riskTier: "passive",
        justification: "Connector smoke test.",
        parameters: {}
      },
      scanId: "scan-smoke",
      tacticId: "tactic-smoke"
    });

    expect(result.success).toBe(false);
  });

  it("applies local dispatch defaults for tool runs", () => {
    const result = toolRunSchema.safeParse({
      id: "tool-run-1",
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      tool: "curl",
      toolId: "tool-1",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      status: "running",
      riskTier: "passive",
      justification: "Check HTTP headers.",
      commandPreview: "curl -I http://example.com",
      startedAt: "2026-04-20T12:00:00.000Z"
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.dispatchMode).toBe("local");
    }
  });

  it("accepts executable ai tools with the simplified custom tool shape", () => {
    const result = aiToolSchema.safeParse({
      id: "tool-1",
      name: "HTTP Recon",
      status: "active",
      source: "custom",
      description: "Bash-backed HTTP probe",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["web-recon"],
      category: "web",
      riskTier: "passive",
      timeoutMs: 30000,
      inputSchema: { type: "object", properties: { target: { type: "string" } } },
      outputSchema: { type: "object", properties: { summary: { type: "string" } } },
      createdAt: "2026-04-21T12:00:00.000Z",
      updatedAt: "2026-04-21T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("accepts builtin ai tools without bash source", () => {
    const result = aiToolSchema.safeParse({
      id: "builtin-complete-run",
      name: "Complete Run",
      status: "active",
      source: "system",
      description: "Workflow built-in action for completing a run successfully.",
      executorType: "builtin",
      builtinActionKey: "complete_run",
      bashSource: null,
      capabilities: ["workflow-control"],
      category: "utility",
      riskTier: "passive",
      timeoutMs: 1000,
      inputSchema: { type: "object", properties: { summary: { type: "string" } } },
      outputSchema: { type: "object", properties: { accepted: { type: "boolean" } } },
      createdAt: "2026-04-21T12:00:00.000Z",
      updatedAt: "2026-04-21T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("accepts executable ai tools without explicit sandbox metadata in the CRUD body", () => {
    const result = createAiToolBodySchema.safeParse({
      name: "Unsafe Custom Tool",
      status: "active",
      source: "custom",
      description: "Simplified custom tool body",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["web-recon"],
      category: "utility",
      riskTier: "passive",
      timeoutMs: 30000,
      inputSchema: { type: "object", properties: {} },
      outputSchema: { type: "object", properties: {} }
    });

    expect(result.success).toBe(true);
  });

  it("requires bash tool requests to carry runtime execution metadata", () => {
    const result = toolRequestSchema.safeParse({
      toolId: "tool-1",
      tool: "HTTP Recon",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      layer: "L7",
      riskTier: "passive",
      justification: "Run the db-backed tool definition.",
      parameters: {
        commandPreview: "httpx -silent -u http://example.com"
      }
    });

    expect(result.success).toBe(false);
  });

  it("accepts bash tool requests with privilege and sandbox metadata", () => {
    const result = toolRequestSchema.safeParse({
      toolId: "tool-1",
      tool: "HTTP Recon",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      layer: "L7",
      riskTier: "passive",
      justification: "Run the db-backed tool definition.",
      sandboxProfile: "network-recon",
      privilegeProfile: "read-only-network",
      parameters: {
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
        commandPreview: "httpx -silent -u http://example.com",
        toolInput: { target: "example.com", baseUrl: "http://example.com" }
      }
    });

    expect(result.success).toBe(true);
  });

  it("defines the defensive loop stages in order", () => {
    expect(defensiveLoopStages).toEqual(["intake", "prioritize", "act", "verify", "record", "handoff"]);
    expect(defensiveLoopContract.stages.map((stage) => stage.stage)).toEqual(defensiveLoopStages);
  });

  it("documents the required defensive loop fields and blocked states", () => {
    expect(defensiveLoopContract.requiredInputs.map((field) => field.key)).toEqual([
      "findings",
      "target",
      "assetContext",
      "priorIteration"
    ]);
    expect(defensiveLoopContract.requiredOutputs.map((field) => field.key)).toEqual([
      "chosenAction",
      "prioritization",
      "evidence",
      "residualRisk",
      "recommendedNextStep",
      "closureSummary"
    ]);
    expect(defensiveLoopContract.failureStates.map((failure) => failure.reason)).toEqual([
      "missing_evidence",
      "ambiguous_scope",
      "unsafe_action"
    ]);
  });

  it("accepts a completed defensive iteration record", () => {
    const prioritization = prioritizeDefensiveAction({
      findings: [
        {
          id: "finding-1",
          title: "Public admin endpoint exposed",
          severity: "high",
          confidence: 0.92,
          summary: "The admin endpoint is reachable from the internet without an IP restriction.",
          evidence: "Ingress policy and probe output show the route is publicly reachable.",
          source: "manual-review"
        },
        {
          id: "finding-2",
          title: "Missing privileged access logging",
          severity: "medium",
          confidence: 0.88,
          summary: "Admin actions are not fully logged after authentication succeeds.",
          evidence: "Audit log review shows missing events for role changes.",
          source: "log-review"
        }
      ],
      observations: [],
      target: {
        kind: "service",
        id: "svc-admin-api",
        displayName: "Admin API",
        environment: "production",
        locator: "admin-api.prod.internal"
      },
      assetContext: {
        assetId: "asset-1",
        assetName: "Admin API",
        criticality: "critical",
        internetExposed: true,
        containsSensitiveData: true,
        notes: ["Production admin surface"]
      },
      priorIteration: {
        iterationId: "iter-000",
        summary: "Previous iteration limited scanner rate but did not reduce exposure.",
        residualRisk: "Admin API remains internet reachable.",
        outstandingFindingIds: ["finding-0"],
        recommendedNextStep: "Reduce exposure on the admin route."
      }
    });

    const result = defensiveIterationRecordSchema.safeParse({
      iterationId: "iter-001",
      stages: ["intake", "prioritize", "act", "verify", "record", "handoff"],
      status: "completed",
      input: {
        findings: [
          {
            id: "finding-1",
            title: "Public admin endpoint exposed",
            severity: "high",
            confidence: 0.92,
            summary: "The admin endpoint is reachable from the internet without an IP restriction.",
            evidence: "Ingress policy and probe output show the route is publicly reachable.",
            source: "manual-review"
          }
        ],
        target: {
          kind: "service",
          id: "svc-admin-api",
          displayName: "Admin API",
          environment: "production",
          locator: "admin-api.prod.internal"
        },
        assetContext: {
          assetId: "asset-1",
          assetName: "Admin API",
          criticality: "critical",
          internetExposed: true,
          containsSensitiveData: true,
          notes: ["Production admin surface"]
        },
        priorIteration: {
          iterationId: "iter-000",
          summary: "Previous iteration limited scanner rate but did not reduce exposure.",
          residualRisk: "Admin API remains internet reachable.",
          outstandingFindingIds: ["finding-0"],
          recommendedNextStep: "Reduce exposure on the admin route."
        }
      },
      prioritization,
      chosenAction: prioritization.selectedAction.action,
      verification: {
        outcome: "verified",
        summary: "The route no longer responds from an untrusted source and still works from approved IP space.",
        checks: ["Curl from blocked source fails", "Smoke test from approved source passes"]
      },
      evidence: [
        {
          type: "config_diff",
          summary: "Ingress manifest now limits source CIDRs.",
          reference: "git diff apps/infra/admin-ingress.yaml"
        },
        {
          type: "test_result",
          summary: "Manual probes confirm the new network boundary.",
          reference: "probe-log-2026-04-13"
        }
      ],
      finalOutcome: {
        status: "mitigated",
        summary: "The route no longer responds from an untrusted source and still works from approved IP space.",
        changeApplied: true
      },
      issueOutcomes: [
        {
          sourceId: "finding-1",
          sourceKind: "finding",
          title: "Public admin endpoint exposed",
          severity: "high",
          disposition: "mitigated",
          summary: "The selected bounded change reduced the issue exposure, but some residual risk may remain for a later iteration.",
          evidenceRefs: ["git diff apps/infra/admin-ingress.yaml", "probe-log-2026-04-13"],
          carryForward: true
        }
      ],
      residualRisk: {
        level: "medium",
        summary: "Exposure is reduced, but admin authentication hardening still needs review.",
        remainingFindingIds: ["finding-auth-1"],
        needsHumanReview: false
      },
      recommendedNextStep: {
        summary: "Review privileged admin authentication flows next.",
        rationale: "The highest remaining risk is credential misuse rather than internet exposure.",
        continueLoop: true
      },
      carryForward: {
        iterationId: "iter-001",
        summary: "1 issue(s) changed state and 1 item(s) carry forward into the next iteration.",
        target: {
          kind: "service",
          id: "svc-admin-api",
          displayName: "Admin API",
          environment: "production",
          locator: "admin-api.prod.internal"
        },
        assetContext: {
          assetId: "asset-1",
          assetName: "Admin API",
          criticality: "critical",
          internetExposed: true,
          containsSensitiveData: true,
          notes: ["Production admin surface"]
        },
        resolvedIssues: [],
        outstandingIssues: [
          {
            sourceId: "finding-1",
            sourceKind: "finding",
            title: "Public admin endpoint exposed",
            severity: "high",
            disposition: "mitigated",
            summary: "The selected bounded change reduced the issue exposure, but some residual risk may remain for a later iteration.",
            evidenceRefs: ["git diff apps/infra/admin-ingress.yaml", "probe-log-2026-04-13"],
            carryForward: true
          }
        ],
        residualRisk: {
          level: "medium",
          summary: "Exposure is reduced, but admin authentication hardening still needs review.",
          remainingFindingIds: ["finding-auth-1"],
          needsHumanReview: false
        },
        recommendedNextStep: {
          summary: "Review privileged admin authentication flows next.",
          rationale: "The highest remaining risk is credential misuse rather than internet exposure.",
          continueLoop: true
        }
      },
      closureSummary: {
        headline: "Defensive iteration complete: one bounded risk reduction landed.",
        summary: "Reduce external exposure for Admin API based on public admin endpoint exposed. Evidence supports the risk reduction claim, and remaining risk is: Exposure is reduced, but admin authentication hardening still needs review.",
        evidenceHighlights: [
          "Ingress manifest now limits source CIDRs.",
          "Manual probes confirm the new network boundary."
        ],
        nextStep: "Review privileged admin authentication flows next.",
        continueLoop: true
      },
      handoffSummary: "Ingress is restricted and the next iteration should focus on admin authentication hardening."
    });

    expect(result.success).toBe(true);
  });

  it("ranks candidate actions and explains why alternatives were not selected", () => {
    const result = prioritizeDefensiveAction({
      findings: [
        {
          id: "finding-1",
          title: "Public admin endpoint exposed",
          severity: "high",
          confidence: 0.92,
          summary: "The admin endpoint is reachable from the internet without an IP restriction.",
          evidence: "Ingress policy and probe output show the route is publicly reachable.",
          source: "manual-review"
        },
        {
          id: "finding-2",
          title: "Missing privileged access logging",
          severity: "medium",
          confidence: 0.88,
          summary: "Admin actions are not fully logged after authentication succeeds.",
          evidence: "Audit log review shows missing events for role changes.",
          source: "log-review"
        }
      ],
      observations: [],
      target: {
        kind: "service",
        id: "svc-admin-api",
        displayName: "Admin API",
        environment: "production",
        locator: "admin-api.prod.internal"
      },
      assetContext: {
        assetId: "asset-1",
        assetName: "Admin API",
        criticality: "critical",
        internetExposed: true,
        containsSensitiveData: true,
        notes: ["Production admin surface"]
      }
    });

    expect(result.selectedAction.action.type).toBe("access_restriction");
    expect(result.rankedActions).toHaveLength(2);
    expect(result.rankedActions[0]?.decision).toBe("selected");
    expect(result.rankedActions[1]?.decision).toBe("not_selected");
    expect(result.rankedActions[1]?.decisionReason).toContain("Not selected");
    expect(result.followUp).toEqual([]);
  });

  it("marks low-confidence findings for follow-up instead of confirmed risk", () => {
    const result = prioritizeDefensiveAction({
      findings: [],
      observations: [
        {
          id: "obs-1",
          title: "Suspicious privileged path",
          severity: "high",
          confidence: 0.6,
          summary: "The path may allow privilege escalation.",
          evidence: "Single unverified report",
          source: "scanner"
        }
      ],
      target: {
        kind: "application",
        id: "app-1",
        displayName: "Operator Portal"
      },
      assetContext: {
        assetId: "asset-2",
        assetName: "Operator Portal",
        criticality: "high",
        internetExposed: true,
        containsSensitiveData: false,
        notes: []
      }
    });

    expect(result.selectedAction.action.type).toBe("manual_investigation");
    expect(result.selectedAction.confidenceDisposition).toBe("follow_up_required");
    expect(result.followUp).toHaveLength(1);
    expect(result.followUp[0]?.recommendedAction).toContain("stronger evidence");
  });

  it("rejects a blocked defensive iteration without a failure state", () => {
    const prioritization = prioritizeDefensiveAction({
      findings: [],
      observations: [
        {
          id: "obs-1",
          title: "Suspicious privileged path",
          severity: "high",
          confidence: 0.6,
          summary: "The path may allow privilege escalation.",
          evidence: "Single unverified report",
          source: "scanner"
        }
      ],
      target: {
        kind: "application",
        id: "app-1",
        displayName: "Operator Portal"
      },
      assetContext: {
        assetId: "asset-2",
        assetName: "Operator Portal",
        criticality: "high",
        internetExposed: true,
        containsSensitiveData: false,
        notes: []
      }
    });

    const result = defensiveIterationRecordSchema.safeParse({
      iterationId: "iter-002",
      stages: ["intake", "prioritize", "act", "verify", "record", "handoff"],
      status: "blocked",
      input: {
        findings: [
          {
            id: "finding-2",
            title: "Suspicious privileged path",
            severity: "high",
            confidence: 0.6,
            summary: "The path may allow privilege escalation.",
            evidence: "Single unverified report",
            source: "scanner"
          }
        ],
        target: {
          kind: "application",
          id: "app-1",
          displayName: "Operator Portal"
        },
        assetContext: {
          assetId: "asset-2",
          assetName: "Operator Portal",
          criticality: "high",
          internetExposed: true,
          containsSensitiveData: false,
          notes: []
        }
      },
      prioritization,
      chosenAction: prioritization.selectedAction.action,
      verification: {
        outcome: "blocked",
        summary: "Execution was blocked before verification.",
        checks: ["Confirmed the evidence is incomplete"]
      },
      evidence: [
        {
          type: "review_note",
          summary: "The current report does not provide enough proof to act."
        }
      ],
      finalOutcome: {
        status: "blocked",
        summary: "Execution was blocked before verification.",
        changeApplied: false
      },
      issueOutcomes: [
        {
          sourceId: "finding-2",
          sourceKind: "finding",
          title: "Suspicious privileged path",
          severity: "high",
          disposition: "unverified",
          summary: "Autonomous mitigation was blocked because the evidence was not strong enough to confirm the issue safely.",
          evidenceRefs: [],
          carryForward: true
        }
      ],
      residualRisk: {
        level: "high",
        summary: "The suspected issue remains unresolved pending stronger evidence.",
        remainingFindingIds: ["finding-2"],
        needsHumanReview: true
      },
      recommendedNextStep: {
        summary: "Reproduce the finding with stronger evidence before any change.",
        rationale: "The scope and exploitability are still ambiguous.",
        continueLoop: false
      },
      carryForward: {
        iterationId: "iter-002",
        summary: "0 issue(s) changed state and 1 item(s) carry forward into the next iteration.",
        target: {
          kind: "application",
          id: "app-1",
          displayName: "Operator Portal"
        },
        assetContext: {
          assetId: "asset-2",
          assetName: "Operator Portal",
          criticality: "high",
          internetExposed: true,
          containsSensitiveData: false,
          notes: []
        },
        resolvedIssues: [],
        outstandingIssues: [
          {
            sourceId: "finding-2",
            sourceKind: "finding",
            title: "Suspicious privileged path",
            severity: "high",
            disposition: "unverified",
            summary: "Autonomous mitigation was blocked because the evidence was not strong enough to confirm the issue safely.",
            evidenceRefs: [],
            carryForward: true
          }
        ],
        residualRisk: {
          level: "high",
          summary: "The suspected issue remains unresolved pending stronger evidence.",
          remainingFindingIds: ["finding-2"],
          needsHumanReview: true
        },
        recommendedNextStep: {
          summary: "Reproduce the finding with stronger evidence before any change.",
          rationale: "The scope and exploitability are still ambiguous.",
          continueLoop: false
        }
      },
      closureSummary: {
        headline: "Defensive iteration blocked: no unsupported remediation was applied.",
        summary: "Reproduce and validate suspicious privileged path before any production change. The loop stopped before making a change. Remaining risk is: The suspected issue remains unresolved pending stronger evidence.",
        evidenceHighlights: [
          "The current report does not provide enough proof to act."
        ],
        nextStep: "Reproduce the finding with stronger evidence before any change.",
        continueLoop: false
      },
      handoffSummary: "Pause autonomous action until the finding can be reproduced."
    });

    expect(result.success).toBe(false);
  });

  it("executes one bounded hardening iteration with focused verification evidence", () => {
    const result = executeDefensiveIteration({
      iterationId: "iter-003",
      input: {
        findings: [
          {
            id: "finding-1",
            title: "Public admin endpoint exposed",
            severity: "high",
            confidence: 0.93,
            summary: "The admin endpoint is reachable from the internet without an IP restriction.",
            evidence: "Ingress policy and probe output show the route is publicly reachable.",
            source: "manual-review"
          }
        ],
        target: {
          kind: "service",
          id: "svc-admin-api",
          displayName: "Admin API",
          environment: "production",
          locator: "admin-api.prod.internal"
        },
        assetContext: {
          assetId: "asset-1",
          assetName: "Admin API",
          criticality: "critical",
          internetExposed: true,
          containsSensitiveData: true,
          notes: ["Production admin surface"]
        }
      },
      observations: [],
      change: {
        summary: "Restricted the admin ingress CIDR allowlist to approved office and VPN ranges.",
        scopeRef: "admin-ingress.yaml allowlist policy",
        rolloutRef: "git diff apps/infra/admin-ingress.yaml",
        reversibleIntent: true,
        affectsMultipleComponents: false,
        destructive: false
      },
      verificationPlan: {
        successCriteria: "The admin route is blocked from untrusted sources and still available to approved operators.",
        checks: ["Curl from an untrusted IP is denied", "Smoke test from the approved VPN range succeeds"]
      },
      evidence: [
        {
          type: "config_diff",
          summary: "Ingress allowlist narrowed to the approved source CIDRs.",
          reference: "git diff apps/infra/admin-ingress.yaml"
        },
        {
          type: "test_result",
          summary: "Verification probes confirm the route now blocks untrusted access.",
          reference: "probe-log-2026-04-13"
        }
      ],
      outcomeSummary: "The ingress rule changed in one place and verification confirmed the route only serves approved sources."
    });

    expect(result.status).toBe("completed");
    expect(result.verification.outcome).toBe("verified");
    expect(result.chosenAction.type).toBe("access_restriction");
    expect(result.finalOutcome.status).toBe("mitigated");
    expect(result.evidence).toHaveLength(2);
    expect(result.issueOutcomes[0]?.disposition).toBe("mitigated");
    expect(result.carryForward.outstandingIssues[0]?.sourceId).toBe("finding-1");
    expect(result.recommendedNextStep.continueLoop).toBe(true);
    expect(result.closureSummary.headline).toContain("Defensive iteration complete");
    expect(result.closureSummary.summary).toContain("remaining risk");
    expect(result.closureSummary.evidenceHighlights).toEqual([
      "Ingress allowlist narrowed to the approved source CIDRs.",
      "Verification probes confirm the route now blocks untrusted access."
    ]);
    expect(result.handoffSummary).toContain("completed");
  });

  it("records fixed, mitigated, unverified, and skipped issue outcomes for future iterations", () => {
    const result = executeDefensiveIteration({
      iterationId: "iter-003b",
      input: {
        findings: [
          {
            id: "finding-patch-1",
            title: "Outdated OpenSSL package",
            severity: "critical",
            confidence: 0.97,
            summary: "The runtime image ships an OpenSSL package with a published fix available.",
            evidence: "Package inventory and CVE review confirm the vulnerable version.",
            source: "package-audit"
          },
          {
            id: "finding-skip-1",
            title: "Public admin endpoint exposed",
            severity: "high",
            confidence: 0.91,
            summary: "The admin endpoint is reachable from the internet without an IP restriction.",
            evidence: "Ingress policy and probe output show the route is publicly reachable.",
            source: "manual-review"
          }
        ],
        target: {
          kind: "runtime",
          id: "runtime-api",
          displayName: "API Runtime",
          environment: "production",
          locator: "api.prod.internal"
        },
        assetContext: {
          assetId: "asset-runtime-1",
          assetName: "API Runtime",
          criticality: "critical",
          internetExposed: true,
          containsSensitiveData: true,
          notes: ["Production runtime"]
        }
      },
      observations: [
        {
          id: "obs-verify-1",
          title: "Possible debug endpoint",
          severity: "medium",
          confidence: 0.62,
          summary: "A debug route may still be exposed.",
          evidence: "Single unverified report from an earlier probe.",
          source: "scanner"
        }
      ],
      change: {
        summary: "Updated the runtime image to the patched OpenSSL version.",
        scopeRef: "api-runtime container image version",
        rolloutRef: "git diff deploy/runtime-api.yaml",
        reversibleIntent: true,
        affectsMultipleComponents: false,
        destructive: false
      },
      verificationPlan: {
        successCriteria: "The patched package version is deployed and the vulnerable version is no longer present.",
        checks: ["Inspect deployed image digest", "Verify package inventory shows the patched version"]
      },
      evidence: [
        {
          type: "config_diff",
          summary: "Deployment manifest now references the patched runtime image.",
          reference: "git diff deploy/runtime-api.yaml"
        },
        {
          type: "test_result",
          summary: "Package inventory confirms the vulnerable OpenSSL version is gone.",
          reference: "inventory-check-2026-04-13"
        }
      ],
      outcomeSummary: "The runtime image was patched in one place and verification confirmed the vulnerable package version was removed."
    });

    expect(result.finalOutcome.status).toBe("fixed");
    expect(result.issueOutcomes.map((issue) => issue.disposition)).toEqual(["fixed", "skipped", "unverified"]);
    expect(result.carryForward.resolvedIssues[0]?.sourceId).toBe("finding-patch-1");
    expect(result.carryForward.outstandingIssues.map((issue) => issue.sourceId)).toEqual(["finding-skip-1", "obs-verify-1"]);
    expect(result.closureSummary.nextStep).toContain("stronger evidence");
  });

  it("blocks an unsafe change that broadens beyond one reversible mitigation", () => {
    const result = executeDefensiveIteration({
      iterationId: "iter-004",
      input: {
        findings: [
          {
            id: "finding-1",
            title: "Public admin endpoint exposed",
            severity: "high",
            confidence: 0.93,
            summary: "The admin endpoint is reachable from the internet without an IP restriction.",
            evidence: "Ingress policy and probe output show the route is publicly reachable.",
            source: "manual-review"
          }
        ],
        target: {
          kind: "service",
          id: "svc-admin-api",
          displayName: "Admin API",
          environment: "production",
          locator: "admin-api.prod.internal"
        },
        assetContext: {
          assetId: "asset-1",
          assetName: "Admin API",
          criticality: "critical",
          internetExposed: true,
          containsSensitiveData: true,
          notes: ["Production admin surface"]
        }
      },
      observations: [],
      change: {
        summary: "Updated ingress, rotated certificates, and changed admin authentication in one rollout.",
        scopeRef: "admin-ingress.yaml and auth-service deployment",
        rolloutRef: "change-request-42",
        reversibleIntent: false,
        affectsMultipleComponents: true,
        destructive: false
      },
      verificationPlan: {
        successCriteria: "Every admin control is tightened.",
        checks: ["Review rollout plan"]
      },
      evidence: [
        {
          type: "review_note",
          summary: "The proposed rollout includes multiple services and no rollback path.",
          reference: "change-request-42"
        }
      ],
      outcomeSummary: "Execution stopped before rollout."
    });

    expect(result.status).toBe("blocked");
    expect(result.failure?.reason).toBe("unsafe_action");
    expect(result.verification.outcome).toBe("blocked");
    expect(result.finalOutcome.status).toBe("blocked");
    expect(result.issueOutcomes[0]?.disposition).toBe("skipped");
    expect(result.closureSummary.headline).toContain("blocked");
    expect(result.closureSummary.continueLoop).toBe(false);
    expect(result.handoffSummary).toContain("No change was applied");
  });

  it("blocks execution when the selected action is not high-confidence enough for autonomous mitigation", () => {
    const result = executeDefensiveIteration({
      iterationId: "iter-005",
      input: {
        findings: [
          {
            id: "finding-2",
            title: "Suspicious privileged path",
            severity: "high",
            confidence: 0.6,
            summary: "The path may allow privilege escalation.",
            evidence: "Single unverified report",
            source: "scanner"
          }
        ],
        target: {
          kind: "application",
          id: "app-1",
          displayName: "Operator Portal"
        },
        assetContext: {
          assetId: "asset-2",
          assetName: "Operator Portal",
          criticality: "high",
          internetExposed: true,
          containsSensitiveData: false,
          notes: []
        }
      },
      observations: [],
      change: {
        summary: "Planned to disable the suspected path.",
        scopeRef: "operator-routing config",
        rolloutRef: "change-request-99",
        reversibleIntent: true,
        affectsMultipleComponents: false,
        destructive: false
      },
      verificationPlan: {
        successCriteria: "The path no longer responds.",
        checks: ["Capture a reproducible failing request first"]
      },
      evidence: [
        {
          type: "review_note",
          summary: "The issue is still only supported by a single unverified report.",
          reference: "finding-2"
        }
      ],
      outcomeSummary: "Execution stopped before rollout."
    });

    expect(result.status).toBe("blocked");
    expect(result.failure?.reason).toBe("ambiguous_scope");
    expect(result.issueOutcomes[0]?.disposition).toBe("unverified");
    expect(result.carryForward.outstandingIssues[0]?.sourceId).toBe("finding-2");
    expect(result.recommendedNextStep.summary).toContain("stronger evidence");
    expect(result.closureSummary.nextStep).toContain("stronger evidence");
  });
});
