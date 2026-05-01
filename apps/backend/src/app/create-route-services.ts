import type { AppDependencies } from "@/app/create-app.js";
import { createEngineServices } from "@/engine/index.js";
import { createToolRuntime } from "@/modules/ai-tools/index.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import { WorkflowRunEvaluationService } from "@/modules/workflow-evals/index.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "targetsRepository"
  | "executionConstraintsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const executionReportsService = new ExecutionReportsService();
  const workflowRunEvaluationService = new WorkflowRunEvaluationService(
    dependencies.workflowsRepository,
    dependencies.targetsRepository,
    dependencies.aiToolsRepository,
    executionReportsService
  );
  const toolRuntime = createToolRuntime(dependencies.aiToolsRepository);
  const executionServices = createEngineServices({
    ...dependencies,
    toolRuntime,
    executionReportsService
  });

  return {
    ...executionServices,
    executionReportsService,
    workflowRunEvaluationService
  };
}
