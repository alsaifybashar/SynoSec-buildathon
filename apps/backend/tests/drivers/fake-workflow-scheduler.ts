import type { WorkflowRunSchedulerPort } from "@/engine/workflow/workflow-execution.service.js";

export class FakeWorkflowScheduler implements WorkflowRunSchedulerPort {
  readonly scheduledRunIds: string[] = [];
  readonly tasks = new Map<string, () => Promise<void>>();

  schedule(runId: string, task: () => Promise<void>) {
    this.scheduledRunIds.push(runId);
    this.tasks.set(runId, task);
    return true;
  }
}
