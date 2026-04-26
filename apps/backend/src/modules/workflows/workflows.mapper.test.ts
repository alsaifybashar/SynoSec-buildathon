import { describe, expect, it } from "vitest";
import { workflowRunSchema } from "@synosec/contracts";
import { mapWorkflowRunRow } from "./workflows.mapper.js";

describe("mapWorkflowRunRow", () => {
  it("normalizes blank persisted event text so workflow runs remain readable", () => {
    const mapped = mapWorkflowRunRow({
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
    } as never);

    expect(() => workflowRunSchema.parse(mapped)).not.toThrow();
    expect(mapped.events[0]).toMatchObject({
      title: "Workflow event",
      summary: "Workflow event",
      detail: null
    });
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
