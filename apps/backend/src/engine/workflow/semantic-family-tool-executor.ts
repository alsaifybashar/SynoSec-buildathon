import type { AiTool, Scan, ToolRun } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import type { ToolRuntime } from "@/modules/ai-tools/index.js";
import type { SemanticFamilyDefinition } from "@/modules/ai-tools/semantic-family-tools.js";
import { inferLayer, normalizeToolInput, parseExecutionTarget, truncate } from "./workflow-execution.utils.js";
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

function isUsableResult(toolRun: ToolRun, observationCount: number) {
  return toolRun.status === "completed" && observationCount > 0;
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
    toolRunId: string;
    toolId: string;
    toolName: string;
    status: ToolRun["status"];
    outputPreview: string;
    rawOutput: string;
    observations: ExecutedToolResult["observations"];
    observationSummaries: string[];
    usedToolId: string;
    usedToolName: string;
    fallbackUsed: boolean;
    attempts: ExecutedToolResult["attempts"];
  };
}> {
  const toolInput = normalizeToolInput(rawInput);
  const missingFields = missingRequiredFields(context.familyDefinition.requiredInputFields, toolInput);
  if (missingFields.length > 0) {
    throw new RequestError(400, `Missing required capability tool input: ${missingFields.join(", ")}.`, {
      code: "SEMANTIC_FAMILY_INPUT_MISSING",
      userFriendlyMessage: "Required capability tool input is missing."
    });
  }

  const executionTarget = parseExecutionTarget(toolInput, context.target);
  const primaryToolId = context.familyDefinition.candidateToolIds[0];
  if (!primaryToolId) {
    throw new RequestError(500, `${context.familyTool.name} has no primary seeded tool configured.`, {
      code: "SEMANTIC_FAMILY_TOOL_MISSING",
      userFriendlyMessage: `${context.familyTool.name} is missing an internal seeded tool dependency.`
    });
  }

  const resolvedCandidate = await context.toolRuntime.get(primaryToolId);
  assertCandidateRunnable(resolvedCandidate, context.familyTool.name, primaryToolId);

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

  if (!isUsableResult(toolRun, brokerResult.observations.length)) {
    throw new RequestError(502, [
      `${context.familyTool.name} failed while running ${resolvedCandidate.tool.name}.`,
      `status=${toolRun.status}`,
      ...(toolRun.exitCode === undefined ? [] : [`exitCode=${toolRun.exitCode}`]),
      ...(toolRun.statusReason ? [`reason=${toolRun.statusReason}`] : []),
      `output=${truncate(toolRun.output ?? "", 400)}`
    ].join(" "), {
      code: "SEMANTIC_FAMILY_TOOL_FAILED",
      userFriendlyMessage: `${context.familyTool.name} failed while running ${resolvedCandidate.tool.name}.`
    });
  }

  const result: ExecutedToolResult = {
    toolId: context.familyTool.id,
    toolName: context.familyDefinition.tool.builtinActionKey ?? context.familyTool.id,
    toolInput,
    toolRequest: request,
    toolRun,
    status: toolRun.status,
    observations: brokerResult.observations,
    observationKeys: brokerResult.observations.map((observation) => observation.key),
    observationSummaries: brokerResult.observations.map((observation) => observation.summary),
    outputPreview: truncate(
      brokerResult.observations[0]?.summary
        ?? toolRun.statusReason
        ?? toolRun.output
        ?? `${context.familyTool.name} completed.`
    ),
    fullOutput: toolRun.output ?? toolRun.statusReason ?? "",
    commandPreview: toolRun.commandPreview,
    ...(toolRun.exitCode === undefined ? {} : { exitCode: toolRun.exitCode }),
    usedToolId: resolvedCandidate.tool.id,
    usedToolName: resolvedCandidate.tool.name,
    fallbackUsed: false,
    attempts: [createAttempt({
      toolId: resolvedCandidate.tool.id,
      toolName: resolvedCandidate.tool.name,
      toolRun,
      output: toolRun.output ?? toolRun.statusReason ?? "",
      selected: true
    })]
  };

  return {
    result,
    response: {
      toolRunId: toolRun.id,
      toolId: context.familyTool.id,
      toolName: result.toolName,
      status: toolRun.status,
      outputPreview: result.outputPreview,
      rawOutput: result.fullOutput,
      observations: result.observations,
      observationSummaries: result.observationSummaries,
      usedToolId: result.usedToolId,
      usedToolName: result.usedToolName,
      fallbackUsed: result.fallbackUsed,
      attempts: result.attempts
    }
  };
}
