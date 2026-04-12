import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  briefResponseSchema,
  createScanRequestSchema,
  createApplicationBodySchema,
  defensiveIterationRecordSchema,
  defensiveLoopContract,
  defensiveLoopStages,
  executeDefensiveIteration,
  prioritizeDefensiveAction,
  demoResponseSchema,
  healthResponseSchema,
  updateApplicationBodySchema
} from "./index.js";

describe("contracts", () => {
  it("accepts a valid health payload", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      service: "synosec-backend",
      timestamp: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid finding severity", () => {
    const result = demoResponseSchema.safeParse({
      scanMode: "depth-first",
      targetCount: 1,
      findings: [
        {
          id: "finding-1",
          target: "localhost",
          severity: "critical",
          summary: "Should fail"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid brief payload", () => {
    const result = briefResponseSchema.safeParse({
      headline: "Manual scan trigger ready.",
      actions: ["Enumerate targets", "Prioritize high-risk findings"],
      generatedAt: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid application payload", () => {
    const result = applicationSchema.safeParse({
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

  it("normalizes empty create payload values", () => {
    const result = createApplicationBodySchema.safeParse({
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
    const result = updateApplicationBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts a scan request with local llm overrides", () => {
    const result = createScanRequestSchema.safeParse({
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L3", "L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false
      },
      llm: {
        provider: "local",
        model: "Qwen/Qwen3-4B",
        baseUrl: "http://127.0.0.1:8000",
        apiPath: "/api/chat/raw"
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
      "recommendedNextStep"
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
    expect(result.evidence).toHaveLength(2);
    expect(result.recommendedNextStep.continueLoop).toBe(true);
    expect(result.handoffSummary).toContain("completed");
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
    expect(result.recommendedNextStep.summary).toContain("stronger evidence");
  });
});
