import type { AiTool, InternalObservation, Scan, ToolRequest, ToolRun } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import type { ToolRuntime } from "@/modules/ai-tools/index.js";
import type { SemanticFamilyDefinition } from "@/modules/ai-tools/semantic-family-tools.js";
import { applyWorkflowRuntimeTarget, compactToolExecutionResult, inferLayer, normalizeToolInput, parseExecutionTarget, truncate } from "./workflow-execution.utils.js";
import type { ExecutedToolResult } from "./workflow-runtime-types.js";
import type { EffectiveExecutionConstraintSet } from "./execution-constraints.js";
import { ToolBroker } from "./broker/tool-broker.js";

export type SemanticFamilyExecutionContext = {
  broker: ToolBroker;
  toolRuntime: ToolRuntime;
  familyTool: AiTool;
  familyDefinition: SemanticFamilyDefinition;
  target: { baseUrl: string; host: string; port?: number };
  scan: Scan;
  tacticId: string;
  agentId: string;
  constraintSet?: EffectiveExecutionConstraintSet;
};

function missingRequiredFields(requiredInputFields: readonly string[], toolInput: Record<string, unknown>) {
  return requiredInputFields.filter((field) => {
    if (field === "hash") {
      const singleHash = toolInput[field];
      const multipleHashes = toolInput["hashes"];
      if (typeof singleHash === "string" && singleHash.trim().length > 0) {
        return false;
      }
      if (Array.isArray(multipleHashes) && multipleHashes.some((entry) => entry.trim().length > 0)) {
        return false;
      }
      return true;
    }

    if (field === "baseUrl") {
      const explicitUrl = ["baseUrl", "url", "startUrl", "loginUrl"]
        .map((key) => toolInput[key])
        .find((value): value is string => typeof value === "string" && value.trim().length > 0);
      if (explicitUrl) {
        return false;
      }

      const candidateTarget = toolInput["target"];
      if (typeof candidateTarget === "string" && /^https?:\/\//.test(candidateTarget)) {
        return false;
      }
    }

    const value = toolInput[field];
    if (value == null) {
      return true;
    }

    return typeof value === "string" ? value.trim().length === 0 : false;
  });
}

function assertCandidateRunnable(
  candidate: { tool: AiTool; runtime: unknown } | null,
  familyName: string,
  toolId: string
): asserts candidate is { tool: AiTool; runtime: unknown } {
  if (!candidate) {
    throw new RequestError(500, `${familyName} is missing its seeded tool dependency ${toolId}.`, {
      code: "SEMANTIC_FAMILY_TOOL_MISSING",
      userFriendlyMessage: `${familyName} is missing an internal seeded tool dependency.`
    });
  }

  if (!candidate.runtime) {
    throw new RequestError(500, `${familyName} resolved ${candidate.tool.name} as a non-runnable builtin dependency.`, {
      code: "SEMANTIC_FAMILY_TOOL_INVALID",
      userFriendlyMessage: `${familyName} resolved an invalid internal tool dependency.`
    });
  }
}

function createAttempt(input: {
  toolId: string;
  toolName: string;
  toolRun: ToolRun;
  output: string;
  selected: boolean;
}) {
  return {
    toolId: input.toolId,
    toolName: input.toolName,
    status: input.toolRun.status,
    ...(input.toolRun.exitCode === undefined ? {} : { exitCode: input.toolRun.exitCode }),
    ...(input.toolRun.statusReason ? { statusReason: input.toolRun.statusReason } : {}),
    outputExcerpt: truncate(input.output, 400),
    selected: input.selected
  };
}

export async function executeSemanticFamilyTool(
  context: SemanticFamilyExecutionContext,
  rawInput: unknown
): Promise<{
  result: ExecutedToolResult;
  response: {
    id: string;
    summary: string;
  };
}> {
  const toolInput = applyWorkflowRuntimeTarget(normalizeToolInput(rawInput), context.target);
  const missingFields = missingRequiredFields(context.familyDefinition.requiredInputFields, toolInput);
  if (missingFields.length > 0) {
    throw new RequestError(400, `Missing required capability tool input: ${missingFields.join(", ")}.`, {
      code: "SEMANTIC_FAMILY_INPUT_MISSING",
      userFriendlyMessage: "Required capability tool input is missing."
    });
  }

  const executionTarget = parseExecutionTarget(toolInput, context.target);
  const candidateToolIds = context.familyDefinition.candidateToolIds;
  if (candidateToolIds.length === 0) {
    throw new RequestError(500, `${context.familyTool.name} has no primary seeded tool configured.`, {
      code: "SEMANTIC_FAMILY_TOOL_MISSING",
      userFriendlyMessage: `${context.familyTool.name} is missing an internal seeded tool dependency.`
    });
  }

  let selectedAttemptIndex = -1;
  let selectedToolId: string | null = null;
  let selectedToolName: string | null = null;
  let selectedRequest: ToolRequest | null = null;
  let selectedToolRun: ToolRun | null = null;
  let selectedObservations: InternalObservation[] = [];
  const attempts: ExecutedToolResult["attempts"] = [];

  for (const candidateToolId of candidateToolIds) {
    const resolvedCandidate = await context.toolRuntime.get(candidateToolId);
    assertCandidateRunnable(resolvedCandidate, context.familyTool.name, candidateToolId);

    const request = await context.toolRuntime.compile(resolvedCandidate.tool.id, {
      target: executionTarget.target,
      ...(executionTarget.port === undefined ? {} : { port: executionTarget.port }),
      layer: inferLayer(resolvedCandidate.tool.category),
      justification: `${context.familyTool.name} delegated execution to ${resolvedCandidate.tool.name}.`,
      toolInput
    });

    const brokerResult = await context.broker.executeRequests({
      scan: context.scan,
      tacticId: context.tacticId,
      agentId: context.agentId,
      requests: [request],
      toolLookup: {
        [resolvedCandidate.tool.id]: resolvedCandidate.tool
      },
      ...(context.constraintSet ? { constraintSet: context.constraintSet } : {})
    });

    const toolRun = brokerResult.toolRuns[0];
    if (!toolRun) {
      throw new RequestError(500, `${context.familyTool.name} did not receive a tool run from ${resolvedCandidate.tool.name}.`, {
        code: "SEMANTIC_FAMILY_TOOL_RUN_MISSING",
        userFriendlyMessage: `${context.familyTool.name} did not receive a valid internal tool run.`
      });
    }

    attempts.push(createAttempt({
      toolId: resolvedCandidate.tool.id,
      toolName: resolvedCandidate.tool.name,
      toolRun,
      output: toolRun.output ?? toolRun.statusReason ?? "",
      selected: false
    }));

    if (toolRun.status === "completed") {
      selectedAttemptIndex = attempts.length - 1;
      selectedToolId = resolvedCandidate.tool.id;
      selectedToolName = resolvedCandidate.tool.name;
      selectedRequest = request;
      selectedToolRun = toolRun;
      selectedObservations = brokerResult.observations;
      break;
    }

    if (selectedAttemptIndex < 0) {
      selectedAttemptIndex = attempts.length - 1;
      selectedToolId = resolvedCandidate.tool.id;
      selectedToolName = resolvedCandidate.tool.name;
      selectedRequest = request;
      selectedToolRun = toolRun;
      selectedObservations = brokerResult.observations;
    }
  }

  if (selectedAttemptIndex < 0 || !selectedToolId || !selectedToolName || !selectedRequest || !selectedToolRun) {
    throw new RequestError(500, `${context.familyTool.name} could not execute any candidate seeded tool.`, {
      code: "SEMANTIC_FAMILY_TOOL_RUN_MISSING",
      userFriendlyMessage: `${context.familyTool.name} could not execute a valid internal tool run.`
    });
  }

  const selectedAttempts = attempts.map((attempt, index) => ({
    ...attempt,
    selected: index === selectedAttemptIndex
  }));
  const publicResult = compactToolExecutionResult({
    toolRunId: selectedToolRun.id,
    toolId: context.familyTool.id,
    toolName: context.familyDefinition.tool.builtinActionKey ?? context.familyTool.id,
    status: selectedToolRun.status,
    outputPreview: selectedObservations[0]?.summary
      ?? selectedToolRun.statusReason
      ?? selectedToolRun.output
      ?? `${context.familyTool.name} ${selectedToolRun.status}.`,
    observations: selectedObservations
  });

  const result: ExecutedToolResult = {
    toolId: context.familyTool.id,
    toolName: context.familyDefinition.tool.builtinActionKey ?? context.familyTool.id,
    toolInput,
    toolRequest: selectedRequest,
    toolRun: selectedToolRun,
    status: selectedToolRun.status,
    observations: selectedObservations,
    publicObservations: publicResult.observations,
    totalObservations: publicResult.totalObservations,
    truncated: publicResult.truncated,
    observationKeys: selectedObservations.map((observation) => observation.key),
    observationSummaries: selectedObservations.map((observation) => observation.summary),
    outputPreview: truncate(publicResult.outputPreview),
    fullOutput: selectedToolRun.output ?? selectedToolRun.statusReason ?? "",
    commandPreview: selectedToolRun.commandPreview,
    ...(selectedToolRun.exitCode === undefined ? {} : { exitCode: selectedToolRun.exitCode }),
    usedToolId: selectedToolId,
    usedToolName: selectedToolName,
    fallbackUsed: selectedAttemptIndex > 0,
    attempts: selectedAttempts
  };

  return {
    result,
    response: {
      id: selectedToolRun.id,
      summary: result.outputPreview
    }
  };
}
