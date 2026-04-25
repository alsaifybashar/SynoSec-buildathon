import type {
  CreateSingleAgentScanRequest,
  ScanLlmConfig
} from "@synosec/contracts";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository } from "@/modules/ai-providers/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { ApplicationsRepository } from "@/modules/applications/index.js";
import {
  SingleAgentExecutionFacade,
  type SingleAgentExecutionDependencies,
  type WorkflowDebugEventInput,
  type WorkflowLinkedScanInput,
  type WorkflowModelOutputInput
} from "@/engine/single-agent/index.js";
import type { RuntimesRepository } from "@/modules/runtimes/index.js";

export class SingleAgentScanService {
  private readonly executionFacade: SingleAgentExecutionFacade;

  constructor(executionFacade: SingleAgentExecutionFacade);
  constructor(
    applicationsRepository: ApplicationsRepository,
    runtimesRepository: RuntimesRepository,
    aiAgentsRepository: AiAgentsRepository,
    aiProvidersRepository: AiProvidersRepository,
    aiToolsRepository: AiToolsRepository
  );
  constructor(
    executionFacadeOrApplicationsRepository: SingleAgentExecutionFacade | ApplicationsRepository,
    runtimesRepository?: RuntimesRepository,
    aiAgentsRepository?: AiAgentsRepository,
    aiProvidersRepository?: AiProvidersRepository,
    aiToolsRepository?: AiToolsRepository
  ) {
    if (executionFacadeOrApplicationsRepository instanceof SingleAgentExecutionFacade) {
      this.executionFacade = executionFacadeOrApplicationsRepository;
      (this as unknown as { broker: unknown }).broker = (this.executionFacade as unknown as { broker: unknown }).broker;
      return;
    }

    this.executionFacade = new SingleAgentExecutionFacade({
      applicationsRepository: executionFacadeOrApplicationsRepository,
      runtimesRepository: runtimesRepository!,
      aiAgentsRepository: aiAgentsRepository!,
      aiProvidersRepository: aiProvidersRepository!,
      aiToolsRepository: aiToolsRepository!
    } satisfies SingleAgentExecutionDependencies);
    (this as unknown as { broker: unknown }).broker = (this.executionFacade as unknown as { broker: unknown }).broker;
  }

  async createAndRunScan(input: CreateSingleAgentScanRequest) {
    return this.executionFacade.createAndRunScan(input);
  }

  async runWorkflowLinkedScan(input: WorkflowLinkedScanInput) {
    await this.executionFacade.runWorkflowLinkedScan(input);
  }
}

export type {
  WorkflowDebugEventInput,
  WorkflowModelOutputInput
};
