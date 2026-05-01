import type { StartWorkflowRunBody, WorkflowLaunch } from "@synosec/contracts";
import type { WorkflowExecutionEngine } from "@/engine/contracts.js";
import { ExecutionSessionRunner } from "@/engine/execution-session-runner.js";
import type { WorkflowRuntimePorts } from "./workflow-runtime.js";
import { WorkflowRuntimeService } from "./workflow-runtime.js";
import { WorkflowRunLauncher } from "./workflow-run-launcher.js";
import { WorkflowRunScheduler } from "./workflow-run-scheduler.js";

export type WorkflowRunSchedulerPort = Pick<WorkflowRunScheduler, "schedule">;
export type WorkflowSessionRunnerPort = Pick<ExecutionSessionRunner, "runWorkflow">;

type WorkflowExecutionServiceOptions = {
  scheduler?: WorkflowRunSchedulerPort;
  sessionRunner?: WorkflowSessionRunnerPort;
};

export class WorkflowExecutionService implements WorkflowExecutionEngine {
  private readonly runtime: WorkflowRuntimeService;
  private readonly launcher: WorkflowRunLauncher;
  private readonly sessionRunner: WorkflowSessionRunnerPort;
  private readonly scheduler: WorkflowRunSchedulerPort;
  private readonly ports: WorkflowRuntimePorts;

  constructor(ports: WorkflowRuntimePorts, options: WorkflowExecutionServiceOptions = {}) {
    this.ports = ports;
    this.runtime = new WorkflowRuntimeService(ports);
    this.launcher = new WorkflowRunLauncher(this.runtime);
    this.sessionRunner = options.sessionRunner ?? new ExecutionSessionRunner({
      workflowExecutor: this.runtime
    });
    this.scheduler = options.scheduler ?? new WorkflowRunScheduler();
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
