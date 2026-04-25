import { OrchestratorExecutionEngineService, OrchestratorStream } from "@/engine/orchestrator/index.js";
import { WorkflowExecutionEngineService, WorkflowRunStream } from "@/engine/workflow/index.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository } from "@/modules/ai-providers/index.js";
import { createToolRuntime, type AiToolsRepository, type ToolRuntime } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import { WorkflowRunArtifactsService, type WorkflowsRepository } from "@/modules/workflows/index.js";

export type EngineDependencies = {
  targetsRepository: TargetsRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  toolRuntime?: ToolRuntime;
  workflowsRepository: WorkflowsRepository;
  executionReportsService: ExecutionReportsService;
};

export function createEngineServices(dependencies: EngineDependencies) {
  const toolRuntime = dependencies.toolRuntime ?? createToolRuntime(dependencies.aiToolsRepository);
  const orchestratorEventStream = new OrchestratorStream();
  const orchestratorExecutionEngine = new OrchestratorExecutionEngineService(
    orchestratorEventStream,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    toolRuntime,
    dependencies.executionReportsService
  );

  const workflowRunEventStream = new WorkflowRunStream();
  const workflowExecutionEngine = new WorkflowExecutionEngineService({
    workflowsRepository: dependencies.workflowsRepository,
    targetsRepository: dependencies.targetsRepository,
    aiAgentsRepository: dependencies.aiAgentsRepository,
    aiProvidersRepository: dependencies.aiProvidersRepository,
    aiToolsRepository: dependencies.aiToolsRepository,
    toolRuntime,
    workflowRunStream: workflowRunEventStream,
    orchestratorExecutionEngine,
    executionReportsService: dependencies.executionReportsService
  });
  const workflowRunArtifactsService = new WorkflowRunArtifactsService(
    dependencies.workflowsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiToolsRepository
  );

  return {
    toolRuntime,
    orchestratorEventStream,
    orchestratorExecutionEngine,
    workflowRunEventStream,
    workflowExecutionEngine,
    workflowRunArtifactsService
  };
}
