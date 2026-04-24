import { createAiAgentsRepositoryFromEnvironment } from "@/features/ai-agents/index.js";
import { createAiProvidersRepositoryFromEnvironment } from "@/features/ai-providers/index.js";
import { createAiToolsRepositoryFromEnvironment } from "@/features/ai-tools/index.js";
import { createApplicationsRepositoryFromEnvironment } from "@/features/applications/index.js";
import { createRuntimesRepositoryFromEnvironment } from "@/features/runtimes/index.js";
import { createWorkflowsRepositoryFromEnvironment } from "@/features/workflows/index.js";

export function buildBackendDependencies() {
  return {
    applicationsRepository: createApplicationsRepositoryFromEnvironment(),
    runtimesRepository: createRuntimesRepositoryFromEnvironment(),
    aiProvidersRepository: createAiProvidersRepositoryFromEnvironment(),
    aiAgentsRepository: createAiAgentsRepositoryFromEnvironment(),
    aiToolsRepository: createAiToolsRepositoryFromEnvironment(),
    workflowsRepository: createWorkflowsRepositoryFromEnvironment()
  };
}
