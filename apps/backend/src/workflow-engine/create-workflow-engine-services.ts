import { createExecutionServices } from "@/execution-engine/create-execution-services.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository } from "@/modules/ai-providers/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { ApplicationsRepository } from "@/modules/applications/index.js";
import type { RuntimesRepository } from "@/modules/runtimes/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/index.js";

type WorkflowEngineDependencies = {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
};

export function createWorkflowEngineServices(dependencies: WorkflowEngineDependencies) {
  return createExecutionServices(dependencies);
}
