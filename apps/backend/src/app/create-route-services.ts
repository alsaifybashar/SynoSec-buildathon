import type { AppDependencies } from "@/app/create-app.js";
import { createEngineServices } from "@/engine/index.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import { WorkflowRunArtifactsService } from "@/modules/workflows/index.js";

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
  const workflowRunArtifactsService = new WorkflowRunArtifactsService(
    dependencies.workflowsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiToolsRepository
  );

  return {
    ...executionServices,
    workflowRunArtifactsService,
    executionReportsService
  };
}
