import { randomUUID } from "node:crypto";
import { workflowTraceEventSchema, type WorkflowLiveModelOutput, type WorkflowRun, type WorkflowStage, type WorkflowTraceEvent } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { WorkflowRunEventPublisher } from "./workflow-run-event-publisher.js";
import type { WorkflowRuntimePorts, WorkflowRunWriterPort } from "./workflow-runtime-types.js";

type PersistedWorkflowTraceType =
  | "system_message"
  | "model_decision"
  | "tool_call"
  | "tool_result"
  | "verification"
  | "finding_reported"
  | "agent_summary"
  | "stage_completed"
  | "stage_failed"
  | "run_completed"
  | "run_failed";

export class WorkflowRunWriter implements WorkflowRunWriterPort {
  private readonly publisher: WorkflowRunEventPublisher;
  private readonly appendQueues = new Map<string, Promise<WorkflowRun>>();

  constructor(private readonly ports: WorkflowRuntimePorts) {
    this.publisher = new WorkflowRunEventPublisher(ports.workflowsRepository, ports.workflowRunStream);
  }

  appendEvent(
    run: WorkflowRun,
    event: WorkflowTraceEvent,
    patch?: {
      status?: WorkflowRun["status"];
      completedAt?: string | null;
      currentStepIndex?: number;
    },
    liveModelOutput?: WorkflowLiveModelOutput | null
  ): Promise<WorkflowRun> {
    const queued = this.appendQueues.get(run.id) ?? Promise.resolve(run);
    const next = queued
      .catch(() => run)
      .then(async () => {
        const latestRun = await this.ports.workflowsRepository.getRunById(run.id) ?? run;
        const normalizedEvent = this.normalizeEvent(latestRun, event, patch);
        this.assertAppendInvariant(latestRun, normalizedEvent, patch);
        return this.publisher.appendEvent(latestRun, normalizedEvent, patch, liveModelOutput);
      });

    this.appendQueues.set(run.id, next);
    void next.finally(() => {
      if (this.appendQueues.get(run.id) === next) {
        this.appendQueues.delete(run.id);
      }
    });

    return next;
  }

  publishSnapshot(run: WorkflowRun, liveModelOutput?: WorkflowLiveModelOutput | null) {
    this.publisher.publishSnapshot(run, liveModelOutput);
  }

  async createExecutionReport(runId: string) {
    await this.ports.executionReportsService.createForWorkflowRun(runId);
  }

  async cancelRunWithUserRequest(runId: string): Promise<WorkflowRun> {
    const run = await this.ports.workflowsRepository.getRunById(runId);
    if (!run) {
      throw new RequestError(404, "Workflow run not found.");
    }

    if (run.status !== "running" && run.status !== "pending") {
      throw new RequestError(400, "Only a running workflow run can be canceled.");
    }

    return this.appendEvent(
      run,
      this.createEvent(
        run,
        run.workflowId,
        null,
        run.events.length,
        "run_failed",
        "failed",
        {
          reason: "Canceled by user",
          canceledBy: "operator"
        },
        "Workflow run canceled",
        "Workflow run canceled by user.",
        "The operator canceled the active workflow run."
      ),
      {
        status: "failed",
        completedAt: new Date().toISOString()
      }
    );
  }

  createEvent(
    run: WorkflowRun,
    workflowId: string,
    workflowStageId: string | null,
    ord: number,
    type: WorkflowTraceEvent["type"],
    status: WorkflowTraceEvent["status"],
    payload: Record<string, unknown>,
    title: string,
    summary: string,
    detail: string | null = null,
    rawStreamPartType?: string
  ): WorkflowTraceEvent {
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    const trimmedDetail = typeof detail === "string"
      ? (detail.trim().length > 0 ? detail.trim() : null)
      : null;

    if (!trimmedTitle || !trimmedSummary) {
      throw new RequestError(500, `Workflow event ${type} is malformed and could not be persisted.`, {
        code: "WORKFLOW_EVENT_INVALID",
        userFriendlyMessage: "The workflow produced an invalid event and could not continue."
      });
    }

    return workflowTraceEventSchema.parse({
      id: randomUUID(),
      workflowRunId: run.id,
      workflowId,
      workflowStageId,
      stepIndex: run.currentStepIndex,
      ord,
      type: this.mapPersistedTraceType(type),
      status,
      title: trimmedTitle,
      summary: trimmedSummary,
      detail: trimmedDetail,
      payload: this.decorateTracePayloadWithRawType(type, payload, rawStreamPartType),
      createdAt: new Date().toISOString()
    });
  }

  async failRunWithStageError(run: WorkflowRun, workflowId: string, stage: WorkflowStage | null, error: unknown): Promise<WorkflowRun> {
    const message = error instanceof Error ? error.message : String(error);
    let currentRun = await this.ports.workflowsRepository.getRunById(run.id) ?? run;
    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent(currentRun, workflowId, stage?.id ?? null, currentRun.events.length, "error", "failed", {
        message
      }, "Workflow execution error", message, message)
    );
    if (stage) {
      currentRun = await this.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflowId, stage.id, currentRun.events.length, "stage_failed", "failed", {
          reason: message,
          stageLabel: stage.label
        }, `Stage failed: ${stage.label}`, message, message)
      );
    }
    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent(currentRun, workflowId, stage?.id ?? null, currentRun.events.length, "run_failed", "failed", {
        reason: message
      }, "Pipeline failed", message, message),
      {
        status: "failed",
        completedAt: new Date().toISOString()
      }
    );
    await this.createExecutionReport(currentRun.id);
    return currentRun;
  }

  async failWorkflowRunAfterUnhandledError(runId: string, workflowId: string, error: unknown) {
    const run = await this.ports.workflowsRepository.getRunById(runId);
    if (!run) {
      console.error("Unhandled workflow pipeline execution failure.", error);
      return;
    }

    if (run.status === "failed" || run.status === "completed") {
      console.error("Unhandled workflow pipeline execution failure after terminal run state.", error instanceof Error ? error.message : String(error));
      return;
    }

    try {
      await this.failRunWithStageError(run, workflowId, null, error);
    } catch (updateError) {
      console.error("Failed to persist workflow run failure state.", updateError);
    }

    console.error("Unhandled workflow pipeline execution failure.", error instanceof Error ? error.message : String(error));
  }

  private mapPersistedTraceType(type: WorkflowTraceEvent["type"]): PersistedWorkflowTraceType {
    switch (type) {
      case "tool_call":
      case "tool_call_delta":
      case "tool_call_streaming_start":
        return "tool_call";
      case "tool_result":
        return "tool_result";
      case "finding_reported":
        return "finding_reported";
      case "error":
      case "abort":
        return "verification";
      case "text":
      case "reasoning":
        return "model_decision";
      case "start":
      case "start-step":
      case "finish":
      case "finish-step":
        return "system_message";
      default:
        return type as PersistedWorkflowTraceType;
    }
  }

  private decorateTracePayload(type: WorkflowTraceEvent["type"], payload: Record<string, unknown>) {
    return {
      ...payload,
      streamPartType: type
    };
  }

  private decorateTracePayloadWithRawType(
    type: WorkflowTraceEvent["type"],
    payload: Record<string, unknown>,
    rawStreamPartType?: string
  ) {
    return {
      ...this.decorateTracePayload(type, payload),
      ...(rawStreamPartType ? { rawStreamPartType } : {})
    };
  }

  private normalizeEvent(
    run: WorkflowRun,
    event: WorkflowTraceEvent,
    patch?: {
      status?: WorkflowRun["status"];
      completedAt?: string | null;
      currentStepIndex?: number;
    }
  ) {
    return workflowTraceEventSchema.parse({
      ...event,
      workflowRunId: run.id,
      stepIndex: patch?.currentStepIndex ?? run.currentStepIndex,
      ord: run.events.length
    });
  }

  private assertAppendInvariant(
    run: WorkflowRun,
    event: WorkflowTraceEvent,
    patch?: {
      status?: WorkflowRun["status"];
      completedAt?: string | null;
      currentStepIndex?: number;
    }
  ) {
    if (event.ord !== run.events.length) {
      throw new RequestError(500, `Workflow event ordering is inconsistent for ${event.type}.`, {
        code: "WORKFLOW_EVENT_ORDER_INVALID",
        userFriendlyMessage: "The workflow produced an out-of-order event and could not continue."
      });
    }

    if ((run.status === "completed" || run.status === "failed") && event.type !== "run_failed") {
      throw new RequestError(409, "Workflow run is already finalized.", {
        code: "WORKFLOW_RUN_FINALIZED",
        userFriendlyMessage: "The workflow run has already finished."
      });
    }

    if (patch?.completedAt && patch.status !== "completed" && patch.status !== "failed") {
      throw new RequestError(500, `Workflow completion timestamp was set without a terminal status for ${event.type}.`, {
        code: "WORKFLOW_COMPLETION_STATE_INVALID",
        userFriendlyMessage: "The workflow completion state was inconsistent and could not continue."
      });
    }

    if (patch?.status === "completed") {
      if (event.type !== "run_completed" || !patch.completedAt) {
        throw new RequestError(500, "Workflow completion must be persisted with a terminal run_completed event.", {
          code: "WORKFLOW_COMPLETION_EVENT_INVALID",
          userFriendlyMessage: "The workflow completion state was inconsistent and could not continue."
        });
      }
    }

    if (patch?.status === "failed") {
      if (event.type !== "run_failed" || !patch.completedAt) {
        throw new RequestError(500, "Workflow failure must be persisted with a terminal run_failed event.", {
          code: "WORKFLOW_FAILURE_EVENT_INVALID",
          userFriendlyMessage: "The workflow failure state was inconsistent and could not continue."
        });
      }
    }
  }
}
