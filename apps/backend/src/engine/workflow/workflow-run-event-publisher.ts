import type { WorkflowLiveModelOutput, WorkflowRun, WorkflowRunStreamState, WorkflowTraceEvent } from "@synosec/contracts";
import { WorkflowRunStream } from "@/engine/workflow/workflow-run-stream.js";
import type { WorkflowsRepository } from "@/modules/workflows/workflows.repository.js";

function summarizeRunForStream(run: WorkflowRun): WorkflowRunStreamState {
  return {
    id: run.id,
    workflowId: run.workflowId,
    workflowLaunchId: run.workflowLaunchId,
    targetId: run.targetId,
    executionKind: run.executionKind,
    preRunEvidenceEnabled: run.preRunEvidenceEnabled,
    preRunEvidenceOverride: run.preRunEvidenceOverride,
    status: run.status,
    currentStepIndex: run.currentStepIndex,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    tokenUsage: run.tokenUsage
  };
}

export class WorkflowRunEventPublisher {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowRunStream: WorkflowRunStream
  ) {}

  async appendEvent(run: WorkflowRun, event: WorkflowTraceEvent, patch?: {
    status?: WorkflowRun["status"];
    completedAt?: string | null;
    currentStepIndex?: number;
  }, liveModelOutput?: WorkflowLiveModelOutput | null) {
    const updatedRun = await this.workflowsRepository.appendRunEvent(run.id, event, patch);
    this.workflowRunStream.publish(updatedRun.id, {
      type: "run_event",
      run: summarizeRunForStream(updatedRun),
      event,
      ...(liveModelOutput === undefined ? {} : { liveModelOutput })
    });
    return updatedRun;
  }

  publishSnapshot(run: WorkflowRun, liveModelOutput?: WorkflowLiveModelOutput | null) {
    this.workflowRunStream.publish(run.id, {
      type: "snapshot",
      run,
      ...(liveModelOutput === undefined ? {} : { liveModelOutput })
    });
  }
}
