import { describe, expect, it } from "vitest";
import { workflowSchema } from "@synosec/contracts";
import { mapWorkflowRow, mapWorkflowRunRow } from "./workflows.mapper.js";

describe("mapWorkflowRow", () => {
  it("preserves stage prompts and handoff schema for attack-vector workflow exports", () => {
    const mapped = mapWorkflowRow({
      id: "20000000-0000-0000-0000-000000000001",
      name: "Attack Vector Planning",
      status: "active",
      executionKind: "workflow",
      description: "Maps attack vectors.",
      applicationId: null,
      createdAt: new Date("2026-04-26T11:39:27.507Z"),
      updatedAt: new Date("2026-04-26T11:39:27.507Z"),
      stages: [{
        id: "30000000-0000-0000-0000-000000000001",
        workflowId: "20000000-0000-0000-0000-000000000001",
        agentId: "40000000-0000-0000-0000-000000000001",
        label: "Attack Vector Planning",
        ord: 0,
        objective: "Link plausible vulnerabilities into explicit attack paths.",
        stageSystemPrompt: "Use the handoff to summarize attackVenues, attackVectors, and prioritized attackPaths that reference finding ids.",
        taskPromptTemplate: null,
        allowedToolIds: ["builtin-http-surface-assessment"],
        requiredEvidenceTypes: [],
        findingPolicy: {
          taxonomy: "typed-core-v1",
          allowedTypes: ["service_exposure", "other"]
        },
        completionRule: {
          requireStageResult: true,
          requireToolCall: false,
          allowEmptyResult: true,
          minFindings: 0
        },
        resultSchemaVersion: 1,
        handoffSchema: {
          type: "object",
          required: ["attackVenues", "attackVectors", "attackPaths"],
          properties: {
            attackVenues: { type: "array" },
            attackVectors: { type: "array" },
            attackPaths: { type: "array" }
          }
        }
      }]
    } as never);

    expect(() => workflowSchema.parse(mapped)).not.toThrow();
    expect(mapped.stageSystemPrompt).toContain("attackVenues, attackVectors, and prioritized attackPaths");
    expect(mapped.handoffSchema).toMatchObject({
      required: ["attackVenues", "attackVectors", "attackPaths"]
    });
    expect(mapped.stages[0]).toMatchObject({
      stageSystemPrompt: expect.stringContaining("attackVenues, attackVectors, and prioritized attackPaths"),
      handoffSchema: {
        required: ["attackVenues", "attackVectors", "attackPaths"]
      }
    });
  });
});

describe("mapWorkflowRunRow", () => {
  it("fails loudly when persisted workflow trace events are malformed", () => {
    expect(() => mapWorkflowRunRow({
      id: "10000000-0000-0000-0000-000000000001",
      workflowId: "20000000-0000-0000-0000-000000000001",
      workflowLaunchId: "40000000-0000-0000-0000-000000000001",
      targetId: "50000000-0000-0000-0000-000000000001",
      executionKind: "workflow",
      status: "running",
      currentStepIndex: 0,
      startedAt: new Date("2026-04-26T02:03:15.068Z"),
      completedAt: null,
      createdAt: new Date("2026-04-26T02:03:15.068Z"),
      updatedAt: new Date("2026-04-26T02:03:15.068Z"),
      traceEvents: [{
        id: "30000000-0000-0000-0000-000000000001",
        workflowRunId: "10000000-0000-0000-0000-000000000001",
        workflowId: "20000000-0000-0000-0000-000000000001",
        workflowStageId: null,
        stepIndex: 0,
        ord: 37,
        type: "tool_result",
        status: "completed",
        title: "   ",
        summary: "",
        detail: "   ",
        payload: {},
        createdAt: new Date("2026-04-26T02:03:30.000Z")
      }]
    } as never)).toThrow();
  });

  it("fails loudly for unsupported attack-map workflow runs", () => {
    expect(() => mapWorkflowRunRow({
      id: "10000000-0000-0000-0000-000000000001",
      workflowId: "20000000-0000-0000-0000-000000000001",
      workflowLaunchId: "40000000-0000-0000-0000-000000000001",
      targetId: "50000000-0000-0000-0000-000000000001",
      executionKind: "attack-map",
      status: "running",
      currentStepIndex: 0,
      startedAt: new Date("2026-04-26T02:03:15.068Z"),
      completedAt: null,
      createdAt: new Date("2026-04-26T02:03:15.068Z"),
      updatedAt: new Date("2026-04-26T02:03:15.068Z"),
      traceEvents: []
    } as never)).toThrow(/unsupported execution kind/i);
  });
});
