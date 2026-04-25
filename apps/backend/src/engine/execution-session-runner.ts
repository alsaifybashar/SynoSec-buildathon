export interface WorkflowSessionExecutor {
  runWorkflowRun(runId: string): Promise<void>;
}

export interface AttackMapSessionExecutor {
  runAttackMapRun(runId: string): Promise<void>;
}

export class ExecutionSessionRunner {
  constructor(private readonly executors: {
    workflowExecutor?: WorkflowSessionExecutor;
    attackMapExecutor?: AttackMapSessionExecutor;
  }) {}

  runWorkflow(runId: string): Promise<void> {
    if (!this.executors.workflowExecutor) {
      throw new Error("Workflow session executor is not configured.");
    }

    return this.executors.workflowExecutor.runWorkflowRun(runId);
  }

  runAttackMap(runId: string): Promise<void> {
    if (!this.executors.attackMapExecutor) {
      throw new Error("Attack-map session executor is not configured.");
    }

    return this.executors.attackMapExecutor.runAttackMapRun(runId);
  }
}
