import { OrchestratorExecutionEngineService, OrchestratorStream } from "@/engine/orchestrator/index.js";
import { WorkflowExecutionEngineService, WorkflowRunStream } from "@/engine/workflow/index.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository } from "@/modules/ai-providers/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/index.js";

export type EngineDependencies = {
  targetsRepository: TargetsRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
  executionReportsService: ExecutionReportsService;
};

export function createEngineServices(dependencies: EngineDependencies) {
  const orchestratorEventStream = new OrchestratorStream();
  const orchestratorExecutionEngine = new OrchestratorExecutionEngineService(
    orchestratorEventStream,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    dependencies.executionReportsService
  );

  const workflowRunEventStream = new WorkflowRunStream();
  const workflowExecutionEngine = new WorkflowExecutionEngineService(
    dependencies.workflowsRepository,
    dependencies.targetsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    workflowRunEventStream,
    orchestratorExecutionEngine,
    dependencies.executionReportsService
  );

  return {
    orchestratorEventStream,
    orchestratorExecutionEngine,
    workflowRunEventStream,
    workflowExecutionEngine
  };
}
