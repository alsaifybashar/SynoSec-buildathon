import { createAiAgentsRepositoryFromEnvironment } from "@/features/ai-agents/create-ai-agents-repository.js";
import { createAiProvidersRepositoryFromEnvironment } from "@/features/ai-providers/create-ai-providers-repository.js";
import { createAiToolsRepositoryFromEnvironment } from "@/features/ai-tools/create-ai-tools-repository.js";
import { createApplicationsRepositoryFromEnvironment } from "@/features/applications/create-applications-repository.js";
import { createRuntimesRepositoryFromEnvironment } from "@/features/runtimes/create-runtimes-repository.js";
import { createWorkflowsRepositoryFromEnvironment } from "@/features/workflows/create-workflows-repository.js";

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
