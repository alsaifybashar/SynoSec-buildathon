import { describe, expect, it, vi } from "vitest";
import type { WorkflowTraceEvent } from "@synosec/contracts";
import { PrismaWorkflowsRepository } from "@/modules/workflows/prisma-workflows.repository.js";

function makeEvent(type: WorkflowTraceEvent["type"], ord: number): WorkflowTraceEvent {
  return {
    id: `50000000-0000-0000-0000-${String(ord + 1).padStart(12, "0")}`,
    workflowRunId: "10000000-0000-0000-0000-000000000001",
    workflowId: "20000000-0000-0000-0000-000000000001",
    workflowStageId: null,
    stepIndex: 0,
    ord,
    type,
    status: "completed",
    title: `${type} title`,
    summary: `${type} summary`,
    detail: null,
    payload: { rawStreamPartType: type },
    createdAt: "2026-04-27T10:00:00.000Z"
  };
}

function createPrismaHarness() {
  const runState = {
    id: "10000000-0000-0000-0000-000000000001",
    workflowId: "20000000-0000-0000-0000-000000000001",
    workflowLaunchId: "30000000-0000-0000-0000-000000000001",
    targetId: "40000000-0000-0000-0000-000000000001",
    executionKind: "workflow",
    status: "running",
    currentStepIndex: 0,
    startedAt: new Date("2026-04-27T09:59:00.000Z"),
    completedAt: null as Date | null,
    traceEvents: [] as Array<Record<string, unknown>>
  };
  const launchState = {
    id: "30000000-0000-0000-0000-000000000001",
    workflowId: "20000000-0000-0000-0000-000000000001",
    status: "running",
    startedAt: new Date("2026-04-27T09:58:00.000Z"),
    completedAt: null as Date | null
  };

  const prisma = {
    workflowRun: {
      findUnique: vi.fn(async () => ({
        ...runState,
        traceEvents: runState.traceEvents
          .slice()
          .sort((left, right) => Number(right["ord"]) - Number(left["ord"]))
          .slice(0, 1)
      })),
      update: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        if (data.status !== undefined) {
          runState.status = data.status;
        }
        if (data.currentStepIndex !== undefined) {
          runState.currentStepIndex = data.currentStepIndex;
        }
        if (Object.prototype.hasOwnProperty.call(data, "completedAt")) {
          runState.completedAt = data.completedAt;
        }
        const createdEvent = data.traceEvents?.create;
        if (createdEvent) {
          runState.traceEvents.push({
            ...createdEvent,
            workflowRunId: runState.id
          });
        }
        return {
          ...runState,
          traceEvents: runState.traceEvents.slice()
        };
      })
    },
    workflowLaunch: {
      findUnique: vi.fn(async () => ({
        ...launchState,
        runs: [{
          status: runState.status,
          traceEvents: runState.traceEvents
            .slice()
            .sort((left, right) => Number(right["ord"]) - Number(left["ord"]))
            .slice(0, 1)
            .map((event) => ({
              type: event["type"],
              ord: event["ord"]
            }))
        }]
      })),
      update: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        launchState.status = data.status;
        launchState.completedAt = data.completedAt;
        return launchState;
      })
    }
  } as any;

  return { prisma, runState, launchState };
}

describe("PrismaWorkflowsRepository", () => {
  it("appends runtime trace event types that the workflow executor emits", async () => {
    const { prisma, runState } = createPrismaHarness();
    const repository = new PrismaWorkflowsRepository(prisma);

    await repository.appendRunEvent(runState.id, makeEvent("text", 0));
    await repository.appendRunEvent(runState.id, makeEvent("system_graph_reported", 1));
    const updated = await repository.appendRunEvent(runState.id, makeEvent("finish-step", 2));

    expect(updated.events.map((event) => event.type)).toEqual([
      "text",
      "system_graph_reported",
      "finish-step"
    ]);
    expect(prisma.workflowRun.update).toHaveBeenCalledTimes(3);
    expect(prisma.workflowLaunch.update).toHaveBeenCalledTimes(3);
  });
});
