import type { WorkflowLiveModelOutput, WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
import { WorkflowRunStream } from "@/engine/workflow/workflow-run-stream.js";
import type { WorkflowsRepository } from "@/modules/workflows/workflows.repository.js";

export class WorkflowRunEventPublisher {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowRunStream: WorkflowRunStream
  ) {}

  async appendEvent(run: WorkflowRun, event: WorkflowTraceEvent, patch?: {
    status?: WorkflowRun["status"];
    completedAt?: string | null;
  }, liveModelOutput?: WorkflowLiveModelOutput | null) {
    const updatedRun = await this.workflowsRepository.appendRunEvent(run.id, event, patch);
    this.workflowRunStream.publish(updatedRun.id, {
      type: "run_event",
      run: updatedRun,
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
