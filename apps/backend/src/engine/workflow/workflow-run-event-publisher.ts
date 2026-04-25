import type { WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
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
  }) {
    const updatedRun = await this.workflowsRepository.appendRunEvent(run.id, event, patch);
    this.workflowRunStream.publish(updatedRun.id, {
      type: "run_event",
      run: updatedRun,
      event
    });
    return updatedRun;
  }

  publishSnapshot(run: WorkflowRun) {
    this.workflowRunStream.publish(run.id, {
      type: "snapshot",
      run
    });
  }
}
