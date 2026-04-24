import type { AppDependencies } from "@/app/create-app.js";
import { OrchestratorExecutionEngineService, OrchestratorStream } from "@/execution-engine/orchestrator/index.js";
import { WorkflowExecutionEngineService, WorkflowRunStream } from "@/execution-engine/workflow/index.js";

export function createExecutionServices(dependencies: Pick<
  AppDependencies,
  | "applicationsRepository"
  | "runtimesRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const orchestratorEventStream = new OrchestratorStream();
  const orchestratorExecutionEngine = new OrchestratorExecutionEngineService(
    orchestratorEventStream,
    dependencies.aiProvidersRepository
  );

  const workflowRunEventStream = new WorkflowRunStream();
  const workflowExecutionEngine = new WorkflowExecutionEngineService(
    dependencies.workflowsRepository,
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    workflowRunEventStream
  );

  return {
    orchestratorEventStream,
    orchestratorExecutionEngine,
    workflowRunEventStream,
    workflowExecutionEngine
  };
}
