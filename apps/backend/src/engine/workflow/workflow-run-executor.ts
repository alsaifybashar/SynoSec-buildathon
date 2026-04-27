import type { RuntimeStartContext, WorkflowExecutionStrategy, WorkflowRuntimePorts, WorkflowRunWriterPort, WorkflowStageRunner } from "./workflow-runtime-types.js";
import { WorkflowRunPreflight } from "./workflow-run-preflight.js";
import { RequestError } from "@/shared/http/request-error.js";

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

        if (outcome.result.status === "insufficient_evidence") {
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
              outcome.result.summary
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
                summary: outcome.result.summary
              },
              "Pipeline failed",
              outcome.result.summary
            ),
            {
              status: "failed",
              completedAt: new Date().toISOString()
            }
          );
          await this.writer.createExecutionReport(currentRun.id);
          return;
        }

        assertStageResultSubmitted(currentRun, stage.id);
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
            outcome.result.summary
          ),
          index === stages.length - 1 ? undefined : { currentStepIndex: index + 1 }
        );

        if (index === stages.length - 1) {
          assertRunReadyForCompletion(currentRun, stage.id);
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
                summary: outcome.result.summary
              },
              "Pipeline completed",
              outcome.result.summary
            ),
            {
              status: "completed",
              completedAt: new Date().toISOString()
            }
          );
          await this.writer.createExecutionReport(currentRun.id);
          return;
        }
      } catch (error) {
        await this.writer.failRunWithStageError(currentRun, context.workflow.id, stage, error);
        return;
      }
    }
  }
}

function assertStageResultSubmitted(run: RuntimeStartContext["run"], stageId: string) {
  const stageResultIndex = findLastEventIndex(run.events, (event) => event.type === "stage_result_submitted" && event.workflowStageId === stageId);
  if (stageResultIndex < 0) {
    throw new RequestError(500, `Stage ${stageId} completed without a persisted stage_result_submitted event.`);
  }
}

function assertRunReadyForCompletion(run: RuntimeStartContext["run"], stageId: string) {
  const stageResultIndex = findLastEventIndex(run.events, (event) => event.type === "stage_result_submitted" && event.workflowStageId === stageId);
  const stageCompletedIndex = findLastEventIndex(run.events, (event) => event.type === "stage_completed" && event.workflowStageId === stageId);

  if (stageResultIndex < 0 || stageCompletedIndex < 0 || stageCompletedIndex < stageResultIndex) {
    throw new RequestError(500, `Run cannot finalize because stage ${stageId} does not have a complete success trail.`);
  }

  const trailingFailures = run.events.slice(stageResultIndex + 1).filter((event) =>
    event.status === "failed" || event.type === "stage_failed" || event.type === "run_failed"
  );
  if (trailingFailures.length > 0) {
    throw new RequestError(500, `Run cannot finalize because failed events remain after stage ${stageId} reported success.`);
  }
}

function findLastEventIndex(
  events: RuntimeStartContext["run"]["events"],
  predicate: (event: RuntimeStartContext["run"]["events"][number]) => boolean
) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event && predicate(event)) {
      return index;
    }
  }

  return -1;
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
