import type { WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
import type { WorkflowsRepository } from "@/features/workflows/workflows.repository.js";
import { WorkflowRunStream } from "@/features/workflows/workflow-run-stream.js";

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
