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

function missingRequiredFields(requiredInputFields: readonly string[], toolInput: Record<string, string | number | boolean | string[]>) {
  return requiredInputFields.filter((field) => {
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
    observations: string[];
    usedToolId: string;
    usedToolName: string;
  };
}> {
  const toolInput = normalizeToolInput(rawInput);
  const missingFields = missingRequiredFields(context.familyDefinition.requiredInputFields, toolInput);
  if (missingFields.length > 0) {
    throw new RequestError(400, `Missing required semantic family input: ${missingFields.join(", ")}.`, {
      code: "SEMANTIC_FAMILY_INPUT_MISSING",
      userFriendlyMessage: "Required semantic family input is missing."
    });
  }

  const executionTarget = parseExecutionTarget(toolInput, context.target);
  const failures: string[] = [];

  for (const candidateToolId of context.familyDefinition.candidateToolIds) {
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

    if (!isUsableResult(toolRun, brokerResult.observations.length)) {
      failures.push([
        `${resolvedCandidate.tool.name} returned no usable evidence.`,
        `status=${toolRun.status}`,
        ...(toolRun.exitCode === undefined ? [] : [`exitCode=${toolRun.exitCode}`]),
        ...(toolRun.statusReason ? [`reason=${toolRun.statusReason}`] : []),
        `output=${truncate(toolRun.output ?? "", 400)}`
      ].join(" "));
      continue;
    }

    const result: ExecutedToolResult = {
      toolId: context.familyTool.id,
      toolName: context.familyDefinition.tool.builtinActionKey ?? context.familyTool.id,
      toolInput,
      toolRequest: request,
      toolRun,
      status: toolRun.status,
      observations: brokerResult.observations.map((observation) => observation.summary),
      observationKeys: brokerResult.observations.map((observation) => observation.key),
      outputPreview: truncate(
        brokerResult.observations[0]?.summary
          ?? toolRun.statusReason
          ?? toolRun.output
          ?? `${context.familyTool.name} completed.`
      ),
      fullOutput: toolRun.output ?? toolRun.statusReason ?? ""
    };

    return {
      result,
      response: {
        toolRunId: toolRun.id,
        toolId: context.familyTool.id,
        toolName: result.toolName,
        status: toolRun.status,
        outputPreview: result.outputPreview,
        observations: result.observations,
        usedToolId: resolvedCandidate.tool.id,
        usedToolName: resolvedCandidate.tool.name
      }
    };
  }

  throw new RequestError(502, `${context.familyTool.name} failed across all seeded candidates. ${failures.join(" ")}`.trim(), {
    code: "SEMANTIC_FAMILY_TOOL_FAILED",
    userFriendlyMessage: `${context.familyTool.name} failed across all seeded candidates.`
  });
}
