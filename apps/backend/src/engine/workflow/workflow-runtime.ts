import type { StartWorkflowRunBody } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { DefaultWorkflowStageExecutor } from "./workflow-default-stage-executor.js";
import { WorkflowRunExecutor } from "./workflow-run-executor.js";
import { WorkflowRunPreflight } from "./workflow-run-preflight.js";
import { WorkflowRunWriter } from "./workflow-run-writer.js";
import type { WorkflowLaunchResult, WorkflowRuntimePorts } from "./workflow-runtime-types.js";

export type { WorkflowArtifactReader, WorkflowRuntimePorts } from "./workflow-runtime-types.js";

export class WorkflowRuntimeService {
  private readonly preflight: WorkflowRunPreflight;
  private readonly writer: WorkflowRunWriter;
  private readonly stageExecutor: DefaultWorkflowStageExecutor;
  private readonly runExecutor: WorkflowRunExecutor;

  constructor(private readonly ports: WorkflowRuntimePorts) {
    this.preflight = new WorkflowRunPreflight(ports);
    this.writer = new WorkflowRunWriter(ports);
    this.stageExecutor = new DefaultWorkflowStageExecutor(ports, this.preflight, this.writer);
    this.runExecutor = new WorkflowRunExecutor(this.preflight, this.writer, this.stageExecutor);
  }

  async launchWorkflowRun(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowLaunchResult> {
    await this.preflight.prepareWorkflowStart(workflowId);

    const launch = await this.ports.workflowsRepository.createLaunch(workflowId);
    if (!launch) {
      throw new RequestError(404, "Workflow not found.");
    }

    const targets = await this.ports.targetsRepository.list({
      page: 1,
      pageSize: 100,
      q: "",
      sortBy: "name",
      sortDirection: "asc"
    });

    const runnableTargets = targets.items.filter((target) => Boolean(target.baseUrl?.trim()));
    const selectedTargets = resolveLaunchTargets(runnableTargets, input.targetId);

    const targetRuns = await Promise.all(
      selectedTargets.map(async (target) => {
        const run = await this.ports.workflowsRepository.createRun(workflowId, launch.id, target.id);
        if (!run) {
          throw new RequestError(500, `Failed to create workflow run for target ${target.id}.`);
        }
        this.writer.publishSnapshot(run);
        return run.id;
      })
    );

    const hydratedLaunch = await this.ports.workflowsRepository.getLaunchById(launch.id);
    if (!hydratedLaunch) {
      throw new RequestError(404, "Workflow launch not found.");
    }

    return {
      launch: hydratedLaunch,
      runIds: targetRuns
    };
  }

  async runWorkflowRun(runId: string): Promise<void> {
    const context = await this.preflight.loadRuntimeStartContextForRun(runId);

    try {
      await this.runExecutor.execute(context);
    } catch (error) {
      await this.writer.failWorkflowRunAfterUnhandledError(context.run.id, context.workflow.id, error);
    }
  }

  async cancelRun(runId: string): Promise<void> {
    await this.writer.cancelRunWithUserRequest(runId);
  }

  async stepRun(_runId: string): Promise<void> {
    throw new RequestError(400, "Pipeline runs advance automatically after start.");
  }
}

function resolveLaunchTargets<
  T extends {
    id: string;
    baseUrl?: string | null;
  }
>(
  runnableTargets: T[],
  requestedTargetId: string | undefined
) {
  if (requestedTargetId) {
    const selectedTarget = runnableTargets.find((target) => target.id === requestedTargetId);
    if (!selectedTarget) {
      throw new RequestError(400, "Selected workflow target is not runnable.");
    }

    return [selectedTarget];
  }

  const firstRunnableTarget = runnableTargets[0];
  if (!firstRunnableTarget) {
    throw new RequestError(400, "Workflow launch requires at least one runnable target.");
  }

  return [firstRunnableTarget];
}
