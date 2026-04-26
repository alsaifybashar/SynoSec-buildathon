import type { StartWorkflowRunBody, WorkflowLaunch } from "@synosec/contracts";
import type { WorkflowLaunchResult } from "./workflow-runtime-types.js";

export interface WorkflowRunLaunchPort {
  launchWorkflowRun(workflowId: string, input?: StartWorkflowRunBody): Promise<WorkflowLaunchResult>;
}

export class WorkflowRunLauncher {
  constructor(private readonly port: WorkflowRunLaunchPort) {}

  launch(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowLaunchResult> {
    return this.port.launchWorkflowRun(workflowId, input);
  }
}
