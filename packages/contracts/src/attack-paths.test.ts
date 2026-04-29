import { describe, expect, it } from "vitest";
import { type WorkflowReportedFinding, type WorkflowRun, workflowAttackVectorSubmissionSchema } from "./resources.js";
import {
  attackPathHandoffJsonSchema,
  buildAttackPathSummary,
  parseAttackPathHandoff,
  validateAttackPathHandoffReferences
} from "./attack-paths.js";
import { buildWorkflowRunReport } from "./workflow-presentation.js";

function finding(input: Partial<WorkflowReportedFinding> & Pick<WorkflowReportedFinding, "id" | "title">): WorkflowReportedFinding {
  return {
    workflowRunId: "50000000-0000-4000-8000-000000000001",
    workflowStageId: null,
    type: "other",
    severity: "medium",
    confidence: 0.8,
    target: {
      host: "target.local",
      url: `https://target.local/${input.id.slice(0, 4)}`
    },
    evidence: [{ sourceTool: "httpx", quote: "evidence", toolRunRef: "tool-run-1" }],
    impact: `${input.title} impact`,
    recommendation: "Fix it.",
    validationStatus: "single_source",
    derivedFromFindingIds: [],
    relatedFindingIds: [],
    enablesFindingIds: [],
    tags: [],
    createdAt: "2026-04-25T12:00:00.000Z",
    ...input
  };
}

describe("buildAttackPathSummary", () => {
  it("accepts valid explicit attack-vector submissions and rejects missing transition evidence", () => {
    expect(workflowAttackVectorSubmissionSchema.parse({
      kind: "enables",
      sourceFindingId: "10000000-0000-4000-8000-000000000001",
      destinationFindingId: "10000000-0000-4000-8000-000000000002",
      summary: "The first finding enables the second.",
      impact: "A downstream pivot becomes reachable.",
      transitionEvidence: [{
        sourceTool: "httpx",
        quote: "Status: 200",
        toolRunRef: "tool-run-1"
      }],
      confidence: 0.82
    }).kind).toBe("enables");

    expect(() => workflowAttackVectorSubmissionSchema.parse({
      kind: "lateral_movement",
      sourceFindingId: "10000000-0000-4000-8000-000000000001",
      destinationFindingId: "10000000-0000-4000-8000-000000000002",
      summary: "A lateral movement path exists.",
      impact: "Internal access can expand.",
      confidence: 0.72
    })).toThrow(/transitionEvidence/);

    expect(() => workflowAttackVectorSubmissionSchema.parse({
      kind: "unknown",
      sourceFindingId: "10000000-0000-4000-8000-000000000001",
      destinationFindingId: "10000000-0000-4000-8000-000000000002",
      summary: "Invalid vector.",
      impact: "Invalid.",
      confidence: 0.72
    })).toThrow();
  });

  it("validates strict attack-path handoff contracts and references", () => {
    const handoff = parseAttackPathHandoff({
      attackVenues: [{
        id: "venue-admin",
        label: "Admin panel",
        venueType: "web_surface",
        targetLabel: "https://target.local/admin",
        summary: "The admin panel is reachable.",
        findingIds: ["10000000-0000-4000-8000-000000000001"]
      }],
      attackVectors: [{
        id: "vector-admin-auth",
        label: "Admin authentication path",
        sourceVenueId: "venue-admin",
        preconditions: ["Admin panel remains reachable"],
        impact: "Enables follow-on authentication testing.",
        confidence: 0.8,
        findingIds: ["10000000-0000-4000-8000-000000000001"]
      }],
      attackPaths: [{
        id: "path-admin-auth",
        title: "Admin exposure to authentication attack",
        summary: "The reachable admin panel supports a follow-on path.",
        severity: "high",
        venueIds: ["venue-admin"],
        vectorIds: ["vector-admin-auth"],
        findingIds: [
          "10000000-0000-4000-8000-000000000001",
          "10000000-0000-4000-8000-000000000002"
        ]
      }]
    });

    expect(validateAttackPathHandoffReferences({
      handoff,
      findingIds: [
        "10000000-0000-4000-8000-000000000001",
        "10000000-0000-4000-8000-000000000002"
      ]
    })).toEqual([]);
  });

  it("rejects malformed handoff shape and unresolved references", () => {
    expect(() => parseAttackPathHandoff({
      attackVenues: [{
        id: "venue-admin",
        label: "Admin panel",
        venueType: "web_surface",
        targetLabel: "https://target.local/admin",
        summary: "The admin panel is reachable.",
        findingIds: ["not-a-uuid"],
        extra: "not allowed"
      }],
      attackVectors: [],
      attackPaths: []
    })).toThrow();

    const handoff = parseAttackPathHandoff({
      attackVenues: [{
        id: "venue-admin",
        label: "Admin panel",
        venueType: "web_surface",
        targetLabel: "https://target.local/admin",
        summary: "The admin panel is reachable.",
        findingIds: ["10000000-0000-4000-8000-000000000001"]
      }],
      attackVectors: [{
        id: "vector-admin-auth",
        label: "Admin authentication path",
        sourceVenueId: "venue-missing",
        preconditions: ["Admin panel remains reachable"],
        impact: "Enables follow-on authentication testing.",
        confidence: 0.8,
        findingIds: ["10000000-0000-4000-8000-000000000001"]
      }],
      attackPaths: [{
        id: "path-admin-auth",
        title: "Admin exposure to authentication attack",
        summary: "The reachable admin panel supports a follow-on path.",
        severity: "high",
        venueIds: ["venue-admin"],
        vectorIds: ["vector-missing"],
        findingIds: ["10000000-0000-4000-8000-000000000002"]
      }]
    });

    expect(validateAttackPathHandoffReferences({
      handoff,
      findingIds: ["10000000-0000-4000-8000-000000000001"]
    })).toEqual([
      "attackVectors[0].sourceVenueId references unknown venue id venue-missing",
      "attackPaths[0].vectorIds references unknown vector id vector-missing",
      "attackPaths[0].findingIds references unknown finding id 10000000-0000-4000-8000-000000000002"
    ]);
  });

  it("exports a strict JSON-schema-shaped handoff contract for seeded workflows", () => {
    expect(attackPathHandoffJsonSchema).toMatchObject({
      additionalProperties: false,
      required: ["attackVenues", "attackVectors", "attackPaths"],
      properties: {
        attackPaths: {
          minItems: 1,
          items: {
            additionalProperties: false,
            properties: {
              severity: { enum: ["info", "low", "medium", "high", "critical"] },
              findingIds: { minItems: 1, items: { type: "string", minLength: 1 } }
            }
          }
        },
        attackVectors: {
          items: {
            properties: {
              confidence: { minimum: 0, maximum: 1 }
            }
          }
        }
      }
    });
  });

  it("builds a qualified path from explicit enables vectors", () => {
    const entry = finding({
      id: "10000000-0000-4000-8000-000000000001",
      title: "Admin surface exposed",
      severity: "high",
      explanationSummary: "The admin surface is reachable without a gateway.",
      confidenceReason: "A direct probe confirmed the route."
    });
    const pivot = finding({
      id: "10000000-0000-4000-8000-000000000002",
      title: "Privilege pivot confirmed",
      severity: "critical",
      validationStatus: "cross_validated",
      explanationSummary: "Credential reuse reaches a privileged path.",
      confidenceReason: "The follow-on validation succeeded immediately after the entrypoint was confirmed."
    });

    const result = buildAttackPathSummary({
      findings: [entry, pivot],
      attackVectors: [{
        id: "10000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:01:30.000Z",
        kind: "enables",
        sourceFindingId: entry.id,
        destinationFindingId: pivot.id,
        summary: "The exposed admin surface enables the follow-on privileged test.",
        preconditions: ["The admin surface remains reachable."],
        impact: "The privileged test can be attempted from the exposed route.",
        transitionEvidence: [{
          sourceTool: "httpx",
          quote: "Status: 200",
          toolRunRef: "tool-run-1"
        }],
        confidence: 0.82,
        validationStatus: "single_source"
      }]
    });

    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.findingIds).toEqual([entry.id, pivot.id]);
    expect(result.paths[0]?.status).toBe("qualified");
    expect(result.paths[0]?.pathSeverity).toBe("critical");
    expect(result.paths[0]?.pathLinks[0]?.status).toBe("qualified");
    expect(result.paths[0]?.pathLinks[0]?.validation.evidenceLevel).toBe("single_source");
    expect(result.paths[0]?.pathLinks[0]?.validation.summary).toBe("The attack vector transition is backed by explicit transition evidence.");
    expect(result.vectors[0]?.validation.observedTransition).toBe("The exposed admin surface enables the follow-on privileged test.");
    expect(result.vectors[0]?.validation.evidenceRefs).toHaveLength(1);
  });

  it("marks vector validation as cross-validated only when explicit transition evidence is provided", () => {
    const entry = finding({
      id: "11000000-0000-4000-8000-000000000001",
      title: "Admin surface cross-validated",
      validationStatus: "cross_validated"
    });
    const pivot = finding({
      id: "11000000-0000-4000-8000-000000000002",
      title: "Privileged pivot reproduced",
      validationStatus: "reproduced"
    });

    const result = buildAttackPathSummary({
      findings: [entry, pivot],
      attackVectors: [{
        id: "11000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:02:00.000Z",
        kind: "enables",
        sourceFindingId: entry.id,
        destinationFindingId: pivot.id,
        summary: "The confirmed admin surface enables a confirmed privileged pivot.",
        preconditions: ["The admin surface is confirmed reachable."],
        impact: "The privileged pivot is reachable from the confirmed admin surface.",
        transitionEvidence: [{
          sourceTool: "replay",
          quote: "transition cross validated",
          toolRunRef: "tool-run-2"
        }],
        confidence: 0.9,
        validationStatus: "cross_validated"
      }]
    });

    expect(result.paths[0]?.pathLinks[0]?.validation.evidenceLevel).toBe("cross_validated");
    expect(result.vectors[0]?.validation.evidenceLevel).toBe("cross_validated");
    expect(result.paths[0]?.status).toBe("confirmed");
    expect(result.vectors[0]?.status).toBe("confirmed");
  });

  it("projects explicit attack vectors ahead of duplicate finding relationships", () => {
    const entry = finding({
      id: "13000000-0000-4000-8000-000000000001",
      title: "Admin surface exposed",
      enablesFindingIds: ["13000000-0000-4000-8000-000000000002"],
      relationshipExplanations: {
        enables: "Legacy relationship explanation."
      }
    });
    const pivot = finding({
      id: "13000000-0000-4000-8000-000000000002",
      title: "Session pivot validated"
    });

    const result = buildAttackPathSummary({
      findings: [entry, pivot],
      attackVectors: [{
        id: "13000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:03:00.000Z",
        kind: "enables",
        sourceFindingId: entry.id,
        destinationFindingId: pivot.id,
        summary: "Explicit transition evidence shows the admin surface enables the session pivot.",
        preconditions: ["Admin surface remains reachable"],
        impact: "The pivot can be attempted from the exposed admin surface.",
        transitionEvidence: [{
          sourceTool: "httpx",
          quote: "Status: 200",
          toolRunRef: "tool-run-1"
        }],
        confidence: 0.9,
        validationStatus: "single_source"
      }]
    });

    expect(result.paths[0]?.vectorIds).toEqual(["13000000-0000-4000-8000-000000000003"]);
    expect(result.vectors).toHaveLength(1);
    expect(result.vectors[0]?.summary).toContain("Explicit transition evidence");
    expect(result.vectors[0]?.validation.evidenceLevel).toBe("single_source");
    expect(result.vectors[0]?.validation.evidenceRefs).toHaveLength(1);
  });

  it("confirms a path only when explicit transition evidence is cross-validated", () => {
    const entry = finding({
      id: "14000000-0000-4000-8000-000000000001",
      title: "Admin surface exposed",
      severity: "high"
    });
    const pivot = finding({
      id: "14000000-0000-4000-8000-000000000002",
      title: "Privilege pivot reproduced",
      severity: "critical",
      validationStatus: "reproduced"
    });

    const result = buildAttackPathSummary({
      findings: [entry, pivot],
      attackVectors: [{
        id: "14000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:03:00.000Z",
        kind: "enables",
        sourceFindingId: entry.id,
        destinationFindingId: pivot.id,
        summary: "Replay moved from the exposed admin surface to the reproduced privileged pivot.",
        preconditions: ["Admin surface is reachable"],
        impact: "The privileged pivot is reachable after the entrypoint.",
        transitionEvidence: [{
          sourceTool: "replay",
          quote: "transition reproduced",
          toolRunRef: "tool-run-2"
        }],
        confidence: 0.9,
        validationStatus: "cross_validated"
      }]
    });

    expect(result.paths[0]?.status).toBe("confirmed");
    expect(result.paths[0]?.pathLinks[0]?.status).toBe("confirmed");
    expect(result.paths[0]?.pathLinks[0]?.validation.evidenceLevel).toBe("cross_validated");
  });

  it("keeps related-only vectors at relationship-only even when findings are validated", () => {
    const entry = finding({
      id: "12000000-0000-4000-8000-000000000001",
      title: "Admin surface validated",
      validationStatus: "cross_validated"
    });
    const pivot = finding({
      id: "12000000-0000-4000-8000-000000000002",
      title: "Token behavior validated",
      validationStatus: "reproduced"
    });

    const result = buildAttackPathSummary({
      findings: [entry, pivot],
      attackVectors: [{
        id: "12000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:02:30.000Z",
        kind: "related",
        sourceFindingId: entry.id,
        destinationFindingId: pivot.id,
        summary: "The findings share the same administrative surface but no progression was observed.",
        preconditions: [],
        impact: "The findings are related but do not prove a transition.",
        transitionEvidence: [],
        confidence: 0.68,
        validationStatus: "suspected"
      }]
    });

    expect(result.paths[0]?.status).toBe("qualified");
    expect(result.vectors[0]?.validation.evidenceLevel).toBe("relationship_only");
    expect(result.vectors[0]?.validation.observedTransition).toBeNull();
  });

  it("marks a path as qualified when it depends on suspected findings and merges handoff copy", () => {
    const entry = finding({
      id: "20000000-0000-4000-8000-000000000001",
      title: "Legacy login exposed",
      explanationSummary: "The legacy login is reachable from the public edge.",
      confidenceReason: "The route is observable but not yet cross-validated."
    });
    const token = finding({
      id: "20000000-0000-4000-8000-000000000002",
      title: "Token audience mismatch",
      validationStatus: "suspected",
      explanationSummary: "The token validator may accept the wrong audience.",
      confidenceReason: "The result is plausible but still needs a second validation source."
    });

    const result = buildAttackPathSummary({
      findings: [entry, token],
      attackVectors: [{
        id: "20000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:03:00.000Z",
        kind: "related",
        sourceFindingId: entry.id,
        destinationFindingId: token.id,
        summary: "The login exposure correlates with the downstream token weakness.",
        preconditions: [],
        impact: "The weaknesses may combine but the transition is still unproven.",
        transitionEvidence: [],
        confidence: 0.7,
        validationStatus: "suspected"
      }],
      handoff: {
        attackVenues: [{
          id: "venue-legacy-login",
          label: "Legacy login",
          venueType: "web_surface",
          targetLabel: "https://target.local/2000",
          summary: "Legacy login remains exposed.",
          findingIds: [entry.id]
        }],
        attackVectors: [{
          id: "vector-legacy-token",
          label: "Legacy login to token pivot",
          sourceVenueId: "venue-legacy-login",
          preconditions: ["Legacy login is reachable"],
          impact: "Token weakness may be reachable from the login surface.",
          confidence: 0.7,
          findingIds: [entry.id, token.id]
        }],
        attackPaths: [{
          id: "path-legacy-token",
          findingIds: [entry.id, token.id],
          venueIds: ["venue-legacy-login"],
          vectorIds: ["vector-legacy-token"],
          title: "Legacy login to token pivot",
          summary: "Handoff enrichment should replace the default summary.",
          severity: "medium"
        }]
      }
    });

    expect(result.paths[0]?.status).toBe("qualified");
    expect(result.paths[0]?.title).toBe("Legacy login to token pivot");
    expect(result.paths[0]?.summary).toBe("Handoff enrichment should replace the default summary.");
    expect(result.vectors[0]?.validation.evidenceLevel).toBe("relationship_only");
    expect(result.vectors[0]?.validation.observedTransition).toBeNull();
  });

  it("qualifies overclaimed handoff outcomes when the path is not confirmed", () => {
    const exposure = finding({
      id: "21000000-0000-4000-8000-000000000001",
      title: "Release board exposed"
    });
    const diagnostics = finding({
      id: "21000000-0000-4000-8000-000000000002",
      title: "Diagnostics exposed",
      severity: "high"
    });

    const result = buildAttackPathSummary({
      findings: [exposure, diagnostics],
      attackVectors: [{
        id: "21000000-0000-4000-8000-000000000003",
        workflowRunId: exposure.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:03:30.000Z",
        kind: "enables",
        sourceFindingId: exposure.id,
        destinationFindingId: diagnostics.id,
        summary: "The exposed board enables diagnostic data access.",
        preconditions: ["Release board is reachable"],
        impact: "Diagnostic data can support follow-on testing.",
        transitionEvidence: [{
          sourceTool: "httpx",
          quote: "Diagnostics link exposed",
          toolRunRef: "tool-run-3"
        }],
        confidence: 0.8,
        validationStatus: "single_source"
      }],
      handoff: {
        attackVenues: [{
          id: "venue-release",
          label: "Release board",
          venueType: "web_surface",
          targetLabel: "https://target.local/release",
          summary: "Release board is reachable.",
          findingIds: [exposure.id]
        }],
        attackVectors: [{
          id: "vector-release",
          label: "Diagnostics reconnaissance",
          sourceVenueId: "venue-release",
          preconditions: ["Release board is reachable"],
          impact: "Diagnostic data can support follow-on testing.",
          confidence: 0.8,
          findingIds: [exposure.id, diagnostics.id]
        }],
        attackPaths: [{
          id: "path-release",
          title: "Release Management System Compromise",
          summary: "Complete takeover of ReleaseHub release management via credential theft and privilege escalation",
          severity: "critical",
          venueIds: ["venue-release"],
          vectorIds: ["vector-release"],
          findingIds: [exposure.id, diagnostics.id]
        }]
      }
    });

    expect(result.paths[0]?.status).toBe("qualified");
    expect(result.paths[0]?.title).toBe("Potential Release Management System Compromise");
    expect(result.paths[0]?.summary).toBe("possible takeover of ReleaseHub release management via credential-theft opportunity and privilege-escalation opportunity");
  });

  it("marks a path as blocked when progression depends on blocked findings", () => {
    const entry = finding({
      id: "30000000-0000-4000-8000-000000000001",
      title: "Reachable admin endpoint",
      explanationSummary: "The endpoint is externally reachable.",
      confidenceReason: "A direct probe confirmed the endpoint."
    });
    const blocked = finding({
      id: "30000000-0000-4000-8000-000000000002",
      title: "Privilege escalation blocked",
      validationStatus: "blocked",
      explanationSummary: "The exploit path is plausible but blocked by tooling limits.",
      confidenceReason: "The route stopped at a provider-owned control boundary."
    });

    const result = buildAttackPathSummary({
      findings: [entry, blocked],
      attackVectors: [{
        id: "30000000-0000-4000-8000-000000000003",
        workflowRunId: entry.workflowRunId,
        workflowStageId: null,
        createdAt: "2026-04-25T12:04:00.000Z",
        kind: "enables",
        sourceFindingId: entry.id,
        destinationFindingId: blocked.id,
        summary: "The exposed route is required before privileged testing can proceed.",
        preconditions: ["The admin endpoint is reachable."],
        impact: "Privileged testing depends on the reachable route.",
        transitionEvidence: [{
          sourceTool: "httpx",
          quote: "Admin endpoint returned 200",
          toolRunRef: "tool-run-4"
        }],
        confidence: 0.74,
        validationStatus: "blocked"
      }]
    });

    expect(result.paths[0]?.status).toBe("blocked");
    expect(result.paths[0]?.blockedFindingIds).toContain(blocked.id);
    expect(result.vectors[0]?.validation.evidenceLevel).toBe("blocked");
    expect(result.vectors[0]?.validation.blockedReason).toBe("Attack-vector transition validation was blocked or rejected.");
  });
});

describe("buildWorkflowRunReport", () => {
  it("includes attack-path payloads and executive summary in the workflow report", () => {
    const entry = finding({
      id: "40000000-0000-4000-8000-000000000001",
      title: "Admin surface exposed",
      explanationSummary: "The admin surface is reachable without a gateway.",
      confidenceReason: "A direct probe confirmed the route."
    });
    const pivot = finding({
      id: "40000000-0000-4000-8000-000000000002",
      title: "Privilege pivot confirmed",
      severity: "high",
      explanationSummary: "Credential reuse reaches a privileged path.",
      confidenceReason: "The pivot was validated immediately after the exposed entrypoint."
    });

    const run: WorkflowRun = {
      id: "50000000-0000-4000-8000-000000000001",
      workflowId: "60000000-0000-4000-8000-000000000001",
      workflowLaunchId: "70000000-0000-4000-8000-000000000001",
      targetId: "80000000-0000-4000-8000-000000000001",
      executionKind: "workflow",
      preRunEvidenceEnabled: false,
      preRunEvidenceOverride: null,
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-25T12:00:00.000Z",
      completedAt: "2026-04-25T12:05:00.000Z",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "event-1",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "finding_reported",
          status: "completed",
          title: "Finding reported",
          summary: entry.title,
          detail: null,
          payload: { finding: entry },
          createdAt: "2026-04-25T12:01:00.000Z"
        },
        {
          id: "event-2",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 2,
          type: "finding_reported",
          status: "completed",
          title: "Finding reported",
          summary: pivot.title,
          detail: null,
          payload: { finding: pivot },
          createdAt: "2026-04-25T12:02:00.000Z"
        },
        {
          id: "event-3",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 3,
          type: "attack_vector_reported",
          status: "completed",
          title: "Attack vector reported",
          summary: "enables from entry to pivot",
          detail: null,
          payload: {
            attackVector: {
              id: "40000000-0000-4000-8000-000000000003",
              workflowRunId: "50000000-0000-4000-8000-000000000001",
              workflowStageId: null,
              createdAt: "2026-04-25T12:03:00.000Z",
              kind: "enables",
              sourceFindingId: entry.id,
              destinationFindingId: pivot.id,
              summary: "The entrypoint enables the follow-on pivot.",
              preconditions: ["The admin surface remains reachable."],
              impact: "The privileged pivot is reachable from the exposed route.",
              transitionEvidence: [{
                sourceTool: "httpx",
                quote: "Status: 200",
                toolRunRef: "tool-run-1"
              }],
              confidence: 0.82,
              validationStatus: "single_source"
            }
          },
          createdAt: "2026-04-25T12:03:00.000Z"
        },
        {
          id: "event-4",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 4,
          type: "run_completed",
          status: "completed",
          title: "Run completed",
          summary: "The workflow completed.",
          detail: null,
          payload: {
            summary: "The workflow completed with a correlated path."
          },
          createdAt: "2026-04-25T12:05:00.000Z"
        }
      ]
    };

    const report = buildWorkflowRunReport(run);

    expect(report?.attackPaths.paths).toHaveLength(1);
    expect(report?.attackPathExecutiveSummary).toContain("Top path reaches");
  });
});
