import type { RuntimeStartContext, WorkflowExecutionStrategy, WorkflowRuntimePorts, WorkflowRunWriterPort, WorkflowStageRunner } from "./workflow-runtime-types.js";
import { WorkflowRunPreflight } from "./workflow-run-preflight.js";

class DefaultWorkflowExecutionStrategy implements WorkflowExecutionStrategy {
  constructor(
    private readonly preflight: WorkflowRunPreflight,
    private readonly writer: WorkflowRunWriterPort,
    private readonly stageRunner: WorkflowStageRunner
  ) {}

  supports(kind: RuntimeStartContext["workflow"]["executionKind"] | undefined) {
    return kind === "workflow" || kind === undefined;
  }

  async execute(context: RuntimeStartContext): Promise<void> {
    const stages = this.preflight.getOrderedStages(context.workflow);
    let currentRun = context.run;

    for (const [index, stage] of stages.entries()) {
      currentRun = await this.writer.appendEvent(
        currentRun,
        this.writer.createEvent(
          currentRun,
          context.workflow.id,
          stage.id,
          currentRun.events.length,
          "stage_started",
          "running",
          { stageLabel: stage.label },
          `Stage started: ${stage.label}`,
          `Started ${stage.label}.`
        ),
        { currentStepIndex: index }
      );

      try {
        const outcome = await this.stageRunner.run({
          ...context,
          run: currentRun,
          stage
        });
        currentRun = outcome.run;

        if (outcome.result.status !== "completed") {
          currentRun = await this.writer.appendEvent(
            currentRun,
            this.writer.createEvent(
              currentRun,
              context.workflow.id,
              stage.id,
              currentRun.events.length,
              "stage_failed",
              "failed",
              { stageResult: outcome.result, stageLabel: stage.label },
              `Stage failed: ${stage.label}`,
              outcome.result.summary,
              outcome.result.residualRisk
            )
          );
          currentRun = await this.writer.appendEvent(
            currentRun,
            this.writer.createEvent(
              currentRun,
              context.workflow.id,
              stage.id,
              currentRun.events.length,
              "run_failed",
              "failed",
              {
                title: "Pipeline failed",
                summary: outcome.result.summary,
                body: outcome.result.residualRisk,
                reason: outcome.result.recommendedNextStep
              },
              "Pipeline failed",
              outcome.result.summary,
              outcome.result.residualRisk
            ),
            {
              status: "failed",
              completedAt: new Date().toISOString()
            }
          );
          await this.writer.createExecutionReport(currentRun.id);
          return;
        }

        currentRun = await this.writer.appendEvent(
          currentRun,
          this.writer.createEvent(
            currentRun,
            context.workflow.id,
            stage.id,
            currentRun.events.length,
            "stage_completed",
            "completed",
            { stageResult: outcome.result, stageLabel: stage.label },
            `Stage completed: ${stage.label}`,
            outcome.result.summary,
            outcome.result.residualRisk
          ),
          index === stages.length - 1 ? undefined : { currentStepIndex: index + 1 }
        );

        if (index === stages.length - 1) {
          currentRun = await this.writer.appendEvent(
            currentRun,
            this.writer.createEvent(
              currentRun,
              context.workflow.id,
              stage.id,
              currentRun.events.length,
              "run_completed",
              "completed",
              {
                title: "Pipeline completed",
                summary: outcome.result.summary,
                body: outcome.result.residualRisk,
                recommendedNextStep: outcome.result.recommendedNextStep,
                residualRisk: outcome.result.residualRisk
              },
              "Pipeline completed",
              outcome.result.summary,
              outcome.result.residualRisk
            ),
            {
              status: "completed",
              completedAt: new Date().toISOString()
            }
          );
          await this.writer.createExecutionReport(currentRun.id);
        }
      } catch (error) {
        await this.writer.failRunWithStageError(currentRun, context.workflow.id, stage, error);
        return;
      }
    }
  }
}

export class WorkflowRunExecutor {
  private readonly strategies: WorkflowExecutionStrategy[];

  constructor(
    preflight: WorkflowRunPreflight,
    writer: WorkflowRunWriterPort,
    stageRunner: WorkflowStageRunner
  ) {
    this.strategies = [
      new DefaultWorkflowExecutionStrategy(preflight, writer, stageRunner)
    ];
  }

  async execute(context: RuntimeStartContext): Promise<void> {
    const strategy = this.strategies.find((candidate) => candidate.supports(context.workflow.executionKind));
    if (!strategy) {
      throw new Error(`Unsupported workflow execution kind: ${context.workflow.executionKind ?? "workflow"}`);
    }
    await strategy.execute(context);
  }
}
