import { OrchestratorService, OrchestratorStream } from "@/features/orchestrator/index.js";
import { WorkflowExecutionService, WorkflowRunArtifactsService, WorkflowRunStream } from "@/features/workflows/index.js";
import type { AppDependencies } from "@/app/create-app.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "applicationsRepository"
  | "runtimesRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const orchestratorStream = new OrchestratorStream();
  const orchestratorService = new OrchestratorService(orchestratorStream, dependencies.aiProvidersRepository);
  const workflowRunStream = new WorkflowRunStream();
  const workflowExecutionService = new WorkflowExecutionService(
    dependencies.workflowsRepository,
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    workflowRunStream
  );
  const workflowRunArtifactsService = new WorkflowRunArtifactsService(
    dependencies.workflowsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiToolsRepository
  );

  return {
    orchestratorStream,
    orchestratorService,
    workflowRunStream,
    workflowExecutionService,
    workflowRunArtifactsService
  };
}
