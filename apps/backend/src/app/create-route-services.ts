import type { AppDependencies } from "@/app/create-app.js";
import { createExecutionServices } from "@/execution-engine/create-execution-services.js";
import { WorkflowRunArtifactsService } from "@/features/workflows/index.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "applicationsRepository"
  | "runtimesRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const executionServices = createExecutionServices(dependencies);
  const workflowRunArtifactsService = new WorkflowRunArtifactsService(
    dependencies.workflowsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiToolsRepository
  );

  return {
    ...executionServices,
    workflowRunArtifactsService
  };
}
