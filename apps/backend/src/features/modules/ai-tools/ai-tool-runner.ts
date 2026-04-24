import { randomUUID } from "node:crypto";
import {
  AiTool,
  AiToolRunResult,
  type OsiLayer,
  type ToolRequest,
  type ToolRun
} from "@synosec/contracts";
import { RequestError } from "../../../core/http/request-error.js";
import { compileToolRequestFromDefinition } from "./tool-definition.compiler.js";
import { executeScriptedTool } from "../../../workflow-engine/tools/script-executor.js";

function inferLayer(category: string): OsiLayer {
  if (category === "network" || category === "dns" || category === "subdomain") {
    return "L4";
  }

  return "L7";
}

function normalizeToolInput(input: unknown): Record<string, string | number | boolean | string[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, string | number | boolean | string[]> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
      continue;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function parseExecutionTarget(toolInput: Record<string, string | number | boolean | string[]>) {
  const candidateUrl = ["baseUrl", "startUrl", "url"]
    .map((key) => toolInput[key])
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (candidateUrl) {
    try {
      const parsed = new URL(candidateUrl);
      return {
        target: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : undefined
      };
    } catch (error) {
      throw new RequestError(400, `Invalid execution URL: ${candidateUrl}.`, {
        code: "AI_TOOL_TARGET_INVALID",
        userFriendlyMessage: "The AI tool target URL is invalid.",
        cause: error
      });
    }
  }

  const candidateTarget = toolInput["target"];
  if (typeof candidateTarget === "string" && candidateTarget.length > 0) {
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

  throw new RequestError(400, "AI tool execution requires a target host or URL.", {
    code: "AI_TOOL_TARGET_MISSING",
    userFriendlyMessage: "The AI tool target host is required."
  });
}

function validateRequiredFields(tool: AiTool, toolInput: Record<string, string | number | boolean | string[]>) {
  const requiredFields = Array.isArray(tool.inputSchema["required"])
    ? tool.inputSchema["required"].filter((value): value is string => typeof value === "string")
    : [];

  const missing = requiredFields.filter((field) => {
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
    executorType: "bash",
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

export async function runAiTool(tool: AiTool, rawInput: unknown): Promise<AiToolRunResult> {
  const toolInput = normalizeToolInput(rawInput);
  validateRequiredFields(tool, toolInput);
  const executionTarget = parseExecutionTarget(toolInput);
  const request = compileToolRequestFromDefinition(tool, {
    target: executionTarget.target,
    ...(executionTarget.port == null ? {} : { port: executionTarget.port }),
    layer: inferLayer(tool.category),
    justification: `Direct tool test run for ${tool.name}.`,
    toolInput
  });

  const toolRun = createToolRun(request);
  const startedAt = Date.now();
  const result = await executeScriptedTool({
    scanId: toolRun.scanId,
    tacticId: toolRun.tacticId,
    toolRun,
    request
  });

  return {
    toolId: tool.id,
    toolName: tool.name,
    toolInput,
    commandPreview: result.commandPreview ?? toolRun.commandPreview,
    target: request.target,
    port: request.port ?? null,
    output: result.output,
    statusReason: result.statusReason ?? null,
    exitCode: result.exitCode,
    durationMs: Date.now() - startedAt,
    observations: result.observations.map((observation) => ({
      key: observation.key,
      title: observation.title,
      summary: observation.summary,
      severity: observation.severity,
      confidence: observation.confidence,
      evidence: observation.evidence,
      technique: observation.technique,
      ...(observation.port === undefined ? {} : { port: observation.port }),
      relatedKeys: observation.relatedKeys
    }))
  };
}
