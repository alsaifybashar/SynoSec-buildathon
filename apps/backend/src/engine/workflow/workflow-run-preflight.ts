import type { AiTool, Workflow, WorkflowStage } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { derivePrivilegeProfile, deriveSandboxProfile } from "@/modules/ai-tools/tool-execution-config.js";
import {
  authorizeToolAgainstConstraints,
  resolveEffectiveExecutionConstraints,
  type EffectiveExecutionConstraintSet
} from "./execution-constraints.js";
import { inferLayer, parseTarget } from "./workflow-execution.utils.js";
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
    return { workflow };
  }

  async loadRuntimeStartContextForRun(runId: string): Promise<RuntimeStartContext> {
    const { run, workflow } = await this.loadRunContext(runId);
    const targetRecord = await this.ports.targetsRepository.getById(run.targetId);
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
    const runtime = this.loadRuntimeForExecution(executionKind);

    const executionBaseUrl = targetRecord.executionBaseUrl?.trim()
      || constraintSet.normalizedTarget.baseUrl
      || targetRecord.baseUrl
      || `http://${constraintSet.normalizedTarget.host}`;
    const executionTarget = parseTarget(executionBaseUrl);
    const target = {
      baseUrl: executionTarget.baseUrl,
      host: executionTarget.host,
      ...(executionTarget.port === undefined ? {} : { port: executionTarget.port }),
      ...(targetRecord.baseUrl ? { displayBaseUrl: targetRecord.baseUrl } : {})
    };

    const tools = (
      await Promise.all(stage.allowedToolIds.map(async (toolId) => this.ports.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

    const excludedTools: StageDependencies["excludedTools"] = [];
    let compatibleTools = tools;

    if (!constraintSet.localhostException) {
      compatibleTools = tools.filter((tool) => {
        const decision = authorizeToolAgainstConstraints(constraintSet, tool, {
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
        });

        if (!decision.allowed) {
          excludedTools.push({
            id: tool.id,
            name: tool.name,
            reason: decision.reason
          });
        }

        return decision.allowed;
      });
    }

    if (tools.length > 0 && compatibleTools.length === 0) {
      const firstExcluded = excludedTools[0];
      throw new RequestError(
        400,
        `Workflow cannot start because no allowed tools are compatible with the active target constraints.${firstExcluded ? ` First blocked tool: ${firstExcluded.name}.` : ""}`,
        {
          code: "WORKFLOW_TOOL_CONSTRAINT_INCOMPATIBLE",
          userFriendlyMessage: "Workflow cannot start because none of its allowed tools can enforce the active target policy."
        }
      );
    }

    return {
      agent,
      runtime,
      target,
      tools: compatibleTools,
      excludedTools
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

  private loadRuntimeForExecution(_executionKind: Workflow["executionKind"]) {
    const runtime = this.ports.fixedAiRuntime;
    if (runtime.provider === "anthropic" && !runtime.apiKey) {
      throw new RequestError(400, "Anthropic workflow execution requires an API key.");
    }

    if (runtime.provider === "local" && !runtime.baseUrl) {
      throw new RequestError(400, "Local workflow execution requires LLM_LOCAL_BASE_URL.");
    }

    return runtime;
  }
}
