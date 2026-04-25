import type { AppDependencies } from "@/app/create-app.js";
import { createEngineServices } from "@/engine/index.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import { WorkflowRunArtifactsService } from "@/modules/workflows/index.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "applicationsRepository"
  | "executionConstraintsRepository"
  | "runtimesRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const executionServices = createEngineServices(dependencies);
  const workflowRunArtifactsService = new WorkflowRunArtifactsService(
    dependencies.workflowsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiToolsRepository
  );
  const executionReportsService = new ExecutionReportsService();

  return {
    ...executionServices,
    workflowRunArtifactsService,
    executionReportsService
  };
}
