import { createAiAgentsRepositoryFromEnvironment } from "@/modules/ai-agents/index.js";
import { createAiProvidersRepositoryFromEnvironment } from "@/modules/ai-providers/index.js";
import { createAiToolsRepositoryFromEnvironment } from "@/modules/ai-tools/index.js";
import { createApplicationsRepositoryFromEnvironment } from "@/modules/applications/index.js";
import { createRuntimesRepositoryFromEnvironment } from "@/modules/runtimes/index.js";
import { createWorkflowsRepositoryFromEnvironment } from "@/modules/workflows/index.js";

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
