import type { StartWorkflowRunBody, WorkflowRun } from "@synosec/contracts";

export interface WorkflowRunLaunchPort {
  launchWorkflowRun(workflowId: string, input?: StartWorkflowRunBody): Promise<WorkflowRun>;
}

export class WorkflowRunLauncher {
  constructor(private readonly port: WorkflowRunLaunchPort) {}

  launch(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowRun> {
    return this.port.launchWorkflowRun(workflowId, input);
  }
}
