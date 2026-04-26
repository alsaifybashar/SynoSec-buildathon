import { randomUUID } from "node:crypto";
import type { WorkflowLiveModelOutput, WorkflowRun, WorkflowStage, WorkflowTraceEvent } from "@synosec/contracts";
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
    return this.publisher.appendEvent(run, event, patch, liveModelOutput);
  }

  publishSnapshot(run: WorkflowRun, liveModelOutput?: WorkflowLiveModelOutput | null) {
    this.publisher.publishSnapshot(run, liveModelOutput);
  }

  async createExecutionReport(runId: string) {
    await this.ports.executionReportsService.createForWorkflowRun(runId);
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
    return {
      id: randomUUID(),
      workflowRunId: run.id,
      workflowId,
      workflowStageId,
      stepIndex: run.currentStepIndex,
      ord,
      type: this.mapPersistedTraceType(type),
      status,
      title,
      summary,
      detail,
      payload: this.decorateTracePayloadWithRawType(type, payload, rawStreamPartType),
      createdAt: new Date().toISOString()
    };
  }

  async failRunWithStageError(run: WorkflowRun, workflowId: string, stage: WorkflowStage | null, error: unknown): Promise<WorkflowRun> {
    const message = error instanceof Error ? error.message : String(error);
    let currentRun = run;
    let ord = currentRun.events.length;
    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent(currentRun, workflowId, stage?.id ?? null, ord++, "error", "failed", {
        message
      }, "Workflow execution error", message, message)
    );
    if (stage) {
      currentRun = await this.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflowId, stage.id, ord++, "stage_failed", "failed", {
          reason: message,
          stageLabel: stage.label
        }, `Stage failed: ${stage.label}`, message, message)
      );
    }
    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent(currentRun, workflowId, stage?.id ?? null, ord++, "run_failed", "failed", {
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
}
