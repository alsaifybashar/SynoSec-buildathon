import type { AppDependencies } from "@/app/create-app.js";
import { createEngineServices } from "@/engine/index.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "targetsRepository"
  | "executionConstraintsRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const executionReportsService = new ExecutionReportsService();
  const executionServices = createEngineServices({
    ...dependencies,
    executionReportsService
  });

  return {
    ...executionServices,
    workflowRunArtifactsService: executionServices.workflowExecutionEngine,
    executionReportsService
  };
}
