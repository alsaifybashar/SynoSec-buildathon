import type { StartWorkflowRunBody, WorkflowLaunch } from "@synosec/contracts";
import type { WorkflowExecutionEngine } from "@/engine/contracts.js";
import { ExecutionSessionRunner } from "@/engine/execution-session-runner.js";
import type { WorkflowRuntimePorts } from "./workflow-runtime.js";
import { WorkflowRuntimeService } from "./workflow-runtime.js";
import { WorkflowRunLauncher } from "./workflow-run-launcher.js";
import { WorkflowRunScheduler } from "./workflow-run-scheduler.js";

export class WorkflowExecutionService implements WorkflowExecutionEngine {
  private readonly runtime: WorkflowRuntimeService;
  private readonly launcher: WorkflowRunLauncher;
  private readonly sessionRunner: ExecutionSessionRunner;
  private readonly scheduler: WorkflowRunScheduler;
  private readonly ports: WorkflowRuntimePorts;

  constructor(ports: WorkflowRuntimePorts) {
    this.ports = ports;
    this.runtime = new WorkflowRuntimeService(ports);
    this.launcher = new WorkflowRunLauncher(this.runtime);
    this.sessionRunner = new ExecutionSessionRunner({
      workflowExecutor: this.runtime
    });
    this.scheduler = new WorkflowRunScheduler();
  }

  async startRun(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowLaunch> {
    const { launch, runIds } = await this.launcher.launch(workflowId, input);
    for (const runId of runIds) {
      this.scheduler.schedule(runId, async () => {
        const run = await this.ports.workflowsRepository.getRunById(runId);
        if (!run || run.status !== "running") {
          return;
        }

        await this.sessionRunner.runWorkflow(runId).catch((error: unknown) => {
          const message = error instanceof Error ? error.stack ?? error.message : String(error);
          console.error(`Workflow session runner crashed for run ${runId}: ${message}`);
        });
      });
    }
    return launch;
  }

  cancelRun(runId: string): Promise<void> {
    return this.runtime.cancelRun(runId);
  }

  stepRun(runId: string): Promise<void> {
    return this.runtime.stepRun(runId);
  }
}
