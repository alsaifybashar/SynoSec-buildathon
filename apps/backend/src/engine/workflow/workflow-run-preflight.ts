import type { AiTool, Workflow, WorkflowStage } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { derivePrivilegeProfile, deriveSandboxProfile } from "@/modules/ai-tools/tool-execution-config.js";
import type { StoredAiProvider } from "@/modules/ai-providers/index.js";
import {
  authorizeToolAgainstConstraints,
  resolveEffectiveExecutionConstraints,
  type EffectiveExecutionConstraintSet
} from "./execution-constraints.js";
import { inferLayer } from "./workflow-execution.utils.js";
import type {
  RuntimeStartContext,
  StageDependencies,
  WorkflowPreflightReader,
  WorkflowRuntimePorts
} from "./workflow-runtime-types.js";

export class WorkflowRunPreflight implements WorkflowPreflightReader {
  constructor(private readonly ports: WorkflowRuntimePorts) {}

  async prepareWorkflowStart(workflowId: string) {
    const workflow = await this.ports.workflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const targetRecord = await this.ports.targetsRepository.getById(workflow.targetId);
    if (!targetRecord) {
      throw new RequestError(400, "Workflow target not found.");
    }

    const constraintSet = resolveEffectiveExecutionConstraints(targetRecord, 5);
    const orderedStages = this.getOrderedStages(workflow);
    for (const stage of orderedStages) {
      await this.loadStageDependencies(
        stage,
        targetRecord,
        constraintSet,
        workflow.executionKind === "attack-map" ? "attack-map" : "workflow"
      );
    }

    return {
      workflow,
      targetRecord,
      constraintSet
    };
  }

  async loadRuntimeStartContextForRun(runId: string): Promise<RuntimeStartContext> {
    const { run, workflow } = await this.loadRunContext(runId);
    const targetRecord = await this.ports.targetsRepository.getById(workflow.targetId);
    if (!targetRecord) {
      throw new RequestError(400, "Workflow target not found.");
    }

    return {
      workflow,
      run,
      targetRecord,
      constraintSet: resolveEffectiveExecutionConstraints(targetRecord, 5)
    };
  }

  getOrderedStages(workflow: Workflow): WorkflowStage[] {
    const orderedStages = [...workflow.stages].sort((left, right) => left.ord - right.ord);
    if (orderedStages.length === 0) {
      throw new RequestError(400, "Workflow is missing its persisted stage contract.");
    }

    for (const stage of orderedStages) {
      if (!stage.id || !stage.agentId || !stage.label || !stage.objective) {
        throw new RequestError(400, "Workflow stage contract is invalid.");
      }
    }

    return orderedStages;
  }

  async loadStageDependencies(
    stage: WorkflowStage,
    targetRecord: RuntimeStartContext["targetRecord"],
    constraintSet: EffectiveExecutionConstraintSet,
    executionKind: Workflow["executionKind"]
  ): Promise<StageDependencies> {
    const agent = await this.ports.aiAgentsRepository.getById(stage.agentId);
    if (!agent) {
      throw new RequestError(400, "Workflow agent not found.");
    }

    const provider = await this.ports.aiProvidersRepository.getStoredById(agent.providerId);
    if (executionKind === "attack-map") {
      this.assertProviderSupportsAttackMapWorkflowExecution(provider);
    } else {
      this.assertProviderSupportsWorkflowExecution(provider);
    }

    const target = {
      baseUrl: constraintSet.normalizedTarget.baseUrl ?? targetRecord.baseUrl ?? `http://${constraintSet.normalizedTarget.host}`,
      host: constraintSet.normalizedTarget.host,
      ...(constraintSet.normalizedTarget.port === undefined ? {} : { port: constraintSet.normalizedTarget.port })
    };

    const tools = (
      await Promise.all(stage.allowedToolIds.map(async (toolId) => this.ports.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

    if (!constraintSet.localhostException) {
      const incompatibleTool = tools.find((tool) => !authorizeToolAgainstConstraints(constraintSet, tool, {
        toolId: tool.id,
        tool: tool.name,
        executorType: "bash",
        capabilities: tool.capabilities,
        target: target.host,
        ...(target.port === undefined ? {} : { port: target.port }),
        layer: inferLayer(tool.category),
        riskTier: tool.riskTier,
        justification: `Preflight compatibility check for ${tool.name}.`,
        sandboxProfile: deriveSandboxProfile(tool.riskTier),
        privilegeProfile: derivePrivilegeProfile(tool.riskTier),
        parameters: {
          bashSource: tool.bashSource ?? "",
          commandPreview: tool.name,
          toolInput: {
            target: target.host,
            ...(target.baseUrl ? { baseUrl: target.baseUrl } : {})
          }
        }
      }).allowed);

      if (incompatibleTool) {
        throw new RequestError(400, `Workflow cannot start because ${incompatibleTool.name} is not compatible with the active target constraints.`, {
          code: "WORKFLOW_TOOL_CONSTRAINT_INCOMPATIBLE",
          userFriendlyMessage: `Workflow cannot start because ${incompatibleTool.name} cannot enforce the active target policy.`
        });
      }
    }

    return {
      agent,
      provider,
      target,
      tools
    };
  }

  async loadRunContext(runId: string) {
    const run = await this.ports.workflowsRepository.getRunById(runId);
    if (!run) {
      throw new RequestError(404, "Workflow run not found.");
    }

    const workflow = await this.ports.workflowsRepository.getById(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    return { run, workflow };
  }

  private assertProviderSupportsWorkflowExecution(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Workflow agent provider not found.");
    }

    if (provider.kind !== "anthropic") {
      throw new RequestError(400, "Workflow pipeline execution requires an Anthropic provider.");
    }

    if (!provider.apiKey) {
      throw new RequestError(400, "Workflow pipeline execution requires an Anthropic API key.");
    }
  }

  private assertProviderSupportsAttackMapWorkflowExecution(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Workflow agent provider not found.");
    }

    if (provider.kind === "anthropic" && !provider.apiKey) {
      throw new RequestError(400, "Attack-map workflow execution requires an Anthropic API key.");
    }

    if (provider.kind === "local" && !provider.baseUrl) {
      throw new RequestError(400, "Attack-map workflow execution requires a local provider base URL.");
    }
  }
}
