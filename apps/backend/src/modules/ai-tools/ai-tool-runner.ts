import { randomUUID } from "node:crypto";
import {
  AiToolRunResult,
  type InternalObservation,
  type OsiLayer,
  type ToolRequest,
  type ToolRun
} from "@synosec/contracts";
import { compactToolExecutionResult } from "@/engine/workflow/workflow-execution.utils.js";
import {
  executeConnectorActionBatch,
  summarizeConnectorActionResults
} from "@/integrations/connectors/connector-actions.js";
import { RequestError } from "@/shared/http/request-error.js";
import { executeScriptedTool } from "@/engine/tools/script-executor.js";
import type { ToolRuntime } from "./tool-runtime.js";

function inferLayer(category: string): OsiLayer {
  if (category === "topology") {
    return "L3";
  }

  if (category === "auth") {
    return "L5";
  }

  if (category === "network" || category === "dns" || category === "subdomain") {
    return "L4";
  }

  return "L7";
}

function isStructuredToolInputValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isStructuredToolInputValue(entry) || (entry && typeof entry === "object"));
  }
  return typeof value === "object";
}

function normalizeToolInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (isStructuredToolInputValue(value)) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function parseExecutionTarget(toolInput: Record<string, unknown>) {
  const candidateUrl = ["targetUrl", "baseUrl", "startUrl", "url", "loginUrl"]
    .map((key) => toolInput[key])
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (candidateUrl) {
    try {
      const parsed = new URL(candidateUrl);
      return {
        target: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : undefined,
        url: parsed.toString()
      };
    } catch (error) {
      throw new RequestError(400, `Invalid execution URL: ${candidateUrl}.`, {
        code: "AI_TOOL_TARGET_INVALID",
        userFriendlyMessage: "The AI tool target URL is invalid.",
        cause: error
      });
    }
  }

  const validationTargets = toolInput["artifactValidationTargets"] ?? toolInput["validationTargets"];
  if (Array.isArray(validationTargets) && validationTargets.length > 0) {
    const firstTarget = validationTargets.find((target): target is Record<string, unknown> => Boolean(target) && typeof target === "object");
    const candidateValidationUrl = firstTarget
      ? [firstTarget["url"], firstTarget["path"]]
          .find((value): value is string => typeof value === "string" && value.length > 0)
      : null;
    if (candidateValidationUrl && /^https?:\/\//.test(candidateValidationUrl)) {
      try {
        const parsed = new URL(candidateValidationUrl);
        return {
          target: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : undefined,
          url: parsed.toString()
        };
      } catch (error) {
        throw new RequestError(400, `Invalid execution URL: ${candidateValidationUrl}.`, {
          code: "AI_TOOL_TARGET_INVALID",
          userFriendlyMessage: "The AI tool target URL is invalid.",
          cause: error
        });
      }
    }
  }

  const candidateTarget = toolInput["target"];
  if (typeof candidateTarget === "string" && candidateTarget.length > 0) {
    if (/^https?:\/\//.test(candidateTarget)) {
      try {
        const parsed = new URL(candidateTarget);
        return {
          target: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : undefined,
          url: parsed.toString()
        };
      } catch (error) {
        throw new RequestError(400, `Invalid execution URL: ${candidateTarget}.`, {
          code: "AI_TOOL_TARGET_INVALID",
          userFriendlyMessage: "The AI tool target URL is invalid.",
          cause: error
        });
      }
    }

    const normalizedTarget = candidateTarget.replace(/^https?:\/\//, "");
    const [host, rawPort] = normalizedTarget.split(":");
    return {
      target: host || candidateTarget,
      port: rawPort ? Number(rawPort) : undefined
    };
  }

  const candidatePort = toolInput["port"];
  if (typeof candidatePort === "number") {
    throw new RequestError(400, "A port was provided without a target host.", {
      code: "AI_TOOL_TARGET_MISSING",
      userFriendlyMessage: "The AI tool target host is required."
    });
  }

  if (typeof toolInput["token"] === "string" && toolInput["token"].length > 0) {
    return {
      target: "jwt",
      port: undefined
    };
  }

  if (
    (typeof toolInput["hash"] === "string" && toolInput["hash"].length > 0)
    || (Array.isArray(toolInput["hashes"]) && toolInput["hashes"].length > 0)
  ) {
    return {
      target: "offline-artifact",
      port: undefined
    };
  }

  throw new RequestError(400, "AI tool execution requires a target host or URL.", {
    code: "AI_TOOL_TARGET_MISSING",
    userFriendlyMessage: "The AI tool target host is required."
  });
}

function validateRequiredFields(
  inputSchema: Record<string, unknown>,
  toolInput: Record<string, unknown>
) {
  const requiredFields = Array.isArray(inputSchema["required"])
    ? inputSchema["required"].filter((value): value is string => typeof value === "string")
    : [];

  const missing = requiredFields.filter((field) => {
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
      const explicitUrl = ["targetUrl", "baseUrl", "url", "startUrl", "loginUrl"]
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

    if (!(field in toolInput)) {
      return true;
    }

    const value = toolInput[field];
    return typeof value === "string" ? value.trim().length === 0 : false;
  });
  if (missing.length > 0) {
    throw new RequestError(400, `Missing required tool input: ${missing.join(", ")}.`, {
      code: "AI_TOOL_INPUT_MISSING",
      userFriendlyMessage: "Required AI tool input is missing."
    });
  }
}

function createToolRun(request: ToolRequest): ToolRun {
  return {
    id: randomUUID(),
    scanId: randomUUID(),
    tacticId: randomUUID(),
    agentId: randomUUID(),
    ...(request.toolId ? { toolId: request.toolId } : {}),
    tool: request.tool,
    executorType: request.executorType,
    capabilities: request.capabilities,
    target: request.target,
    ...(request.port === undefined ? {} : { port: request.port }),
    status: "running",
    riskTier: request.riskTier,
    justification: request.justification,
    commandPreview: typeof request.parameters["commandPreview"] === "string"
      ? request.parameters["commandPreview"]
      : request.tool,
    dispatchMode: "local",
    startedAt: new Date().toISOString()
  };
}

export async function runAiTool(toolRuntime: ToolRuntime, toolId: string, rawInput: unknown): Promise<AiToolRunResult> {
  const resolved = await toolRuntime.get(toolId);
  if (!resolved) {
    throw new RequestError(404, `AI tool not found: ${toolId}.`, {
      code: "AI_TOOL_NOT_FOUND",
      userFriendlyMessage: "The selected AI tool was not found."
    });
  }

  if (!resolved.runtime) {
    throw new RequestError(400, `${resolved.tool.name} is a built-in action and cannot be run from the AI tools runner.`, {
      code: "AI_TOOL_BUILTIN_NOT_RUNNABLE",
      userFriendlyMessage: "Built-in AI tools cannot be run from the tool runner."
    });
  }

  const { tool } = resolved;
  const toolInput = normalizeToolInput(rawInput);
  let request: ToolRequest;
  let normalizedToolInput = toolInput;

  if (resolved.runtime.executorType === "native-ts") {
    const parsedInput = resolved.runtime.implementation.parseInput(toolInput);
    normalizedToolInput = normalizeToolInput(parsedInput);
    const executionTarget = parseExecutionTarget(normalizedToolInput);
    const actionBatch = resolved.runtime.implementation.plan(parsedInput, { tool });
    const firstAction = actionBatch.actions[0];
    const previewTarget = firstAction?.kind === "http_request"
      ? new URL(firstAction["url"]).pathname || "/"
      : executionTarget.target;
    request = {
      toolId: tool.id,
      tool: tool.name,
      executorType: "native-ts",
      capabilities: resolved.runtime.capabilities,
      target: executionTarget.target,
      ...(executionTarget.port == null ? {} : { port: executionTarget.port }),
      layer: inferLayer(tool.category),
      riskTier: tool.riskTier,
      justification: `Direct tool test run for ${tool.name}.`,
      sandboxProfile: resolved.runtime.sandboxProfile,
      privilegeProfile: resolved.runtime.privilegeProfile,
      parameters: {
        timeoutMs: resolved.runtime.timeoutMs,
        commandPreview: `${tool.id} ${firstAction?.kind === "http_request" ? firstAction["method"] : "EXEC"} ${previewTarget} x${actionBatch.actions.length} bounded requests`,
        toolInput: normalizedToolInput,
        actionBatch
      }
    };
  } else {
    validateRequiredFields(tool.inputSchema, toolInput);
    const executionTarget = parseExecutionTarget(toolInput);
    request = await toolRuntime.compile(tool.id, {
      target: executionTarget.target,
      ...(executionTarget.port == null ? {} : { port: executionTarget.port }),
      layer: inferLayer(tool.category),
      justification: `Direct tool test run for ${tool.name}.`,
      toolInput
    });
  }

  const toolRun = createToolRun(request);
  const startedAt = Date.now();
  let output = "";
  let statusReason: string | null = null;
  let exitCode = 1;
  let commandPreview = toolRun.commandPreview;
  let observations: InternalObservation[] = [];

  if (request.executorType === "native-ts" && resolved.runtime.executorType === "native-ts") {
    const actionBatch = request.parameters["actionBatch"] as { actions: Parameters<typeof executeConnectorActionBatch>[0] };
    const nativeResult = await executeConnectorActionBatch(actionBatch.actions);
    const parsedNativeResult = resolved.runtime.implementation.parse(
      nativeResult.actionResults,
      resolved.runtime.implementation.parseInput(normalizedToolInput),
      {
        request,
        toolRun,
        scanId: toolRun.scanId,
        tacticId: toolRun.tacticId
      }
    );

    output = parsedNativeResult.summary || summarizeConnectorActionResults(nativeResult.actionResults);
    statusReason = parsedNativeResult.statusReason ?? null;
    exitCode = parsedNativeResult.exitCode;
    observations = parsedNativeResult.observations;
  } else {
    const result = await executeScriptedTool({
      scanId: toolRun.scanId,
      tacticId: toolRun.tacticId,
      toolRun,
      request
    });

    output = result.output;
    statusReason = result.statusReason ?? null;
    exitCode = result.exitCode;
    commandPreview = result.commandPreview ?? toolRun.commandPreview;
    observations = result.observations;
  }

  const publicResult = compactToolExecutionResult({
    toolRunId: toolRun.id,
    toolId: tool.id,
    toolName: tool.name,
    status: exitCode === 0 ? "completed" : "failed",
    outputPreview: output,
    observations
  });

  return {
    toolId: tool.id,
    toolName: tool.name,
    toolInput: normalizedToolInput,
    commandPreview,
    target: request.target,
    port: request.port ?? null,
    output,
    statusReason,
    exitCode,
    durationMs: Date.now() - startedAt,
    observations: publicResult.observations,
    totalObservations: publicResult.totalObservations,
    truncated: publicResult.truncated
  };
}
