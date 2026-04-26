import { WorkflowExecutionEngineService, WorkflowRunStream } from "@/engine/workflow/index.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import { createToolRuntime, type AiToolsRepository, type ToolRuntime } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import { WorkflowRunArtifactsService, type WorkflowsRepository } from "@/modules/workflows/index.js";
import { loadFixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";

export type EngineDependencies = {
  targetsRepository: TargetsRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  toolRuntime?: ToolRuntime;
  workflowsRepository: WorkflowsRepository;
  executionReportsService: ExecutionReportsService;
};

export function createEngineServices(dependencies: EngineDependencies) {
  const toolRuntime = dependencies.toolRuntime ?? createToolRuntime(dependencies.aiToolsRepository);
  const fixedAiRuntime = loadFixedAiRuntime();
  const workflowRunEventStream = new WorkflowRunStream();
  const workflowExecutionEngine = new WorkflowExecutionEngineService({
    workflowsRepository: dependencies.workflowsRepository,
    targetsRepository: dependencies.targetsRepository,
    aiAgentsRepository: dependencies.aiAgentsRepository,
    aiToolsRepository: dependencies.aiToolsRepository,
    toolRuntime,
    workflowRunStream: workflowRunEventStream,
    executionReportsService: dependencies.executionReportsService,
    fixedAiRuntime
  });
  const workflowRunArtifactsService = new WorkflowRunArtifactsService(
    dependencies.workflowsRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiToolsRepository
  );

  return {
    toolRuntime,
    workflowRunEventStream,
    workflowExecutionEngine,
    workflowRunArtifactsService
  };
}
