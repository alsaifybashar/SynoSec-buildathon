import type { AppDependencies } from "@/app/create-app.js";
import { WorkflowRunArtifactsService } from "@/modules/workflows/index.js";
import { createWorkflowEngineServices } from "@/workflow-engine/index.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "applicationsRepository"
  | "runtimesRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const executionServices = createWorkflowEngineServices(dependencies);
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
