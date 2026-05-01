import { createAiToolsRepositoryFromEnvironment } from "@/modules/ai-tools/index.js";
import { createExecutionConstraintsRepositoryFromEnvironment } from "@/modules/execution-constraints/index.js";
import { createTargetsRepositoryFromEnvironment } from "@/modules/targets/index.js";
import { createWorkflowsRepositoryFromEnvironment } from "@/modules/workflows/index.js";

export function buildBackendDependencies() {
  return {
    targetsRepository: createTargetsRepositoryFromEnvironment(),
    executionConstraintsRepository: createExecutionConstraintsRepositoryFromEnvironment(),
    aiToolsRepository: createAiToolsRepositoryFromEnvironment(),
    workflowsRepository: createWorkflowsRepositoryFromEnvironment()
  };
}
