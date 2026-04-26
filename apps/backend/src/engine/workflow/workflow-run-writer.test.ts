import { describe, expect, it, vi } from "vitest";
import type { WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
import { WorkflowRunStream } from "./workflow-run-stream.js";
import { WorkflowRunWriter } from "./workflow-run-writer.js";

function makeRun(): WorkflowRun {
  return {
    id: "50000000-0000-4000-8000-000000000001",
    workflowId: "60000000-0000-4000-8000-000000000001",
    workflowLaunchId: "70000000-0000-4000-8000-000000000001",
    targetId: "80000000-0000-4000-8000-000000000001",
    executionKind: "workflow",
    status: "running",
    currentStepIndex: 0,
    startedAt: "2026-04-26T12:00:00.000Z",
    completedAt: null,
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    },
    trace: [],
    events: []
  };
}

describe("WorkflowRunWriter", () => {
  it("serializes concurrent appends from the same stale run snapshot", async () => {
    let currentRun = makeRun();
    const appendedEvents: WorkflowTraceEvent[] = [];
    const runStream = new WorkflowRunStream();

    const writer = new WorkflowRunWriter({
      workflowsRepository: {
        getRunById: async () => currentRun,
        appendRunEvent: async (_runId: string, event: WorkflowTraceEvent, patch = {}) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (event.ord !== currentRun.events.length) {
            throw new Error(`out-of-sequence:${event.ord}:${currentRun.events.length}`);
          }
          currentRun = {
            ...currentRun,
            ...patch,
            trace: currentRun.trace.slice(),
            tokenUsage: currentRun.tokenUsage,
            events: [...currentRun.events, event]
          };
          appendedEvents.push(event);
          return currentRun;
        }
      },
      workflowRunStream: runStream,
      executionReportsService: {
        createForWorkflowRun: vi.fn(async () => undefined)
      }
    } as any);

    const staleRun = currentRun;
    const eventA = writer.createEvent(
      staleRun,
      staleRun.workflowId,
      null,
      staleRun.events.length,
      "verification",
      "completed",
      { message: "A" },
      "Verification A",
      "A"
    );
    const eventB = writer.createEvent(
      staleRun,
      staleRun.workflowId,
      null,
      staleRun.events.length,
      "verification",
      "failed",
      { message: "B" },
      "Verification B",
      "B"
    );

    const [updatedA, updatedB] = await Promise.all([
      writer.appendEvent(staleRun, eventA),
      writer.appendEvent(staleRun, eventB)
    ]);

    expect(currentRun.events).toHaveLength(2);
    expect(appendedEvents.map((event) => event.ord)).toEqual([0, 1]);
    expect(updatedA.events.length).toBeGreaterThanOrEqual(1);
    expect(updatedB.events).toHaveLength(2);
  });
});
