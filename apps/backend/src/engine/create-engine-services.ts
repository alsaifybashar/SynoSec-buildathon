import { OrchestratorExecutionEngineService, OrchestratorStream } from "@/engine/orchestrator/index.js";
import { WorkflowExecutionEngineService, WorkflowRunStream } from "@/engine/workflow/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository } from "@/modules/ai-providers/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { ApplicationsRepository } from "@/modules/applications/index.js";
import type { RuntimesRepository } from "@/modules/runtimes/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/index.js";

export type EngineDependencies = {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
};

export function createEngineServices(dependencies: EngineDependencies) {
  const orchestratorEventStream = new OrchestratorStream();
  const orchestratorExecutionEngine = new OrchestratorExecutionEngineService(
    orchestratorEventStream,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository
  );

  const workflowRunEventStream = new WorkflowRunStream();
  const workflowExecutionEngine = new WorkflowExecutionEngineService(
    dependencies.workflowsRepository,
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    workflowRunEventStream,
    orchestratorExecutionEngine
  );

  return {
    orchestratorEventStream,
    orchestratorExecutionEngine,
    workflowRunEventStream,
    workflowExecutionEngine
  };
}
