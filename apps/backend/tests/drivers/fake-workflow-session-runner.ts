import type { WorkflowSessionRunnerPort } from "@/engine/workflow/workflow-execution.service.js";

export class FakeWorkflowSessionRunner implements WorkflowSessionRunnerPort {
  readonly runIds: string[] = [];

  async runWorkflow(runId: string) {
    this.runIds.push(runId);
  }
}
