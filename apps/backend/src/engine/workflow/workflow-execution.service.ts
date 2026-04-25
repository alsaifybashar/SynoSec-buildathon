import type { StartWorkflowRunBody, WorkflowRun } from "@synosec/contracts";
import type { WorkflowExecutionEngine } from "@/engine/contracts.js";
import { ExecutionSessionRunner } from "@/engine/execution-session-runner.js";
import type { WorkflowRuntimePorts } from "./workflow-runtime.js";
import { WorkflowRuntimeService } from "./workflow-runtime.js";
import { WorkflowRunLauncher } from "./workflow-run-launcher.js";

export class WorkflowExecutionService implements WorkflowExecutionEngine {
  private readonly runtime: WorkflowRuntimeService;
  private readonly launcher: WorkflowRunLauncher;
  private readonly sessionRunner: ExecutionSessionRunner;

  constructor(ports: WorkflowRuntimePorts) {
    this.runtime = new WorkflowRuntimeService(ports);
    this.launcher = new WorkflowRunLauncher(this.runtime);
    this.sessionRunner = new ExecutionSessionRunner({
      workflowExecutor: this.runtime
    });
  }

  async startRun(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowRun> {
    const run = await this.launcher.launch(workflowId, input);
    void this.sessionRunner.runWorkflow(run.id);
    return run;
  }

  stepRun(runId: string): Promise<void> {
    return this.runtime.stepRun(runId);
  }
}
