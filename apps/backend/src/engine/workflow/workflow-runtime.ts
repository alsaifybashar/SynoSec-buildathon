import type { StartWorkflowRunBody, WorkflowRun } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { DefaultWorkflowStageExecutor } from "./workflow-default-stage-executor.js";
import { AttackMapWorkflowRunExecutor } from "./workflow-attack-map-run-executor.js";
import { WorkflowRunExecutor } from "./workflow-run-executor.js";
import { WorkflowRunPreflight } from "./workflow-run-preflight.js";
import { WorkflowRunWriter } from "./workflow-run-writer.js";
import type { WorkflowRuntimePorts } from "./workflow-runtime-types.js";

export type { WorkflowArtifactReader, WorkflowRuntimePorts } from "./workflow-runtime-types.js";

export class WorkflowRuntimeService {
  private readonly preflight: WorkflowRunPreflight;
  private readonly writer: WorkflowRunWriter;
  private readonly stageExecutor: DefaultWorkflowStageExecutor;
  private readonly attackMapExecutor: AttackMapWorkflowRunExecutor;
  private readonly runExecutor: WorkflowRunExecutor;

  constructor(private readonly ports: WorkflowRuntimePorts) {
    this.preflight = new WorkflowRunPreflight(ports);
    this.writer = new WorkflowRunWriter(ports);
    this.stageExecutor = new DefaultWorkflowStageExecutor(ports, this.preflight, this.writer);
    this.attackMapExecutor = new AttackMapWorkflowRunExecutor(ports, this.preflight, this.writer);
    this.runExecutor = new WorkflowRunExecutor(this.preflight, this.writer, this.stageExecutor, this.attackMapExecutor);
  }

  async launchWorkflowRun(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowRun> {
    void input;

    await this.preflight.prepareWorkflowStart(workflowId);

    const run = await this.ports.workflowsRepository.createRun(workflowId);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    this.writer.publishSnapshot(run);
    return run;
  }

  async runWorkflowRun(runId: string): Promise<void> {
    const context = await this.preflight.loadRuntimeStartContextForRun(runId);

    try {
      await this.runExecutor.execute(context);
    } catch (error) {
      await this.writer.failWorkflowRunAfterUnhandledError(context.run.id, context.workflow.id, error);
    }
  }

  async stepRun(_runId: string): Promise<void> {
    throw new RequestError(400, "Pipeline runs advance automatically after start.");
  }
}
