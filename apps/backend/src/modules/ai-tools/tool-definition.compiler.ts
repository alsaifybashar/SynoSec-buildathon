import type { AiTool, OsiLayer, ToolRequest } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { derivePrivilegeProfile, deriveSandboxProfile } from "./tool-execution-config.js";

export type CompilableTool = Pick<
  AiTool,
  "id" | "name" | "executorType" | "bashSource" | "riskTier" | "timeoutMs"
> & {
  capabilities: readonly string[];
};

export interface CompileInput {
  target: string;
  layer: OsiLayer;
  justification: string;
  port?: number;
  toolInput?: Record<string, string | number | boolean | string[]>;
}

const MAX_TOOL_TIMEOUT_MS = 10_000;

function firstExplicitUrl(toolInput?: Record<string, string | number | boolean | string[]>) {
  for (const key of ["baseUrl", "startUrl", "url", "loginUrl"] as const) {
    const value = toolInput?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  const target = toolInput?.["target"];
  if (typeof target === "string" && /^https?:\/\//.test(target)) {
    return target;
  }

  return null;
}

function interpolateArgument(template: string, input: CompileInput): string {
  const configuredBaseUrl = input.toolInput?.["baseUrl"];
  const baseUrl = typeof configuredBaseUrl === "string" && configuredBaseUrl.trim().length > 0
    ? configuredBaseUrl
    : `http://${input.target}${input.port ? `:${input.port}` : ""}`;
  let result = template
    .replaceAll("{target}", input.target)
    .replaceAll("{baseUrl}", baseUrl)
    .replaceAll("{port}", input.port == null ? "" : String(input.port));

  for (const [key, value] of Object.entries(input.toolInput ?? {})) {
    if (Array.isArray(value)) {
      continue;
    }
    result = result.replaceAll(`{${key}}`, String(value));
  }

  return result;
}

export function compileToolRequestFromDefinition(tool: CompilableTool, input: CompileInput): ToolRequest {
  if (
    tool.executorType !== "bash"
    || !tool.bashSource
    || tool.capabilities.length === 0
  ) {
    throw new RequestError(500, "This AI tool is not configured for bash execution.", {
      code: "AI_TOOL_BASH_NOT_CONFIGURED",
      userFriendlyMessage: "This AI tool is not configured for bash execution."
    });
  }

  const explicitUrl = firstExplicitUrl(input.toolInput);
  const toolInput = {
    target: input.target,
    ...(input.port == null ? {} : { port: input.port }),
    baseUrl: explicitUrl ?? `http://${input.target}${input.port ? `:${input.port}` : ""}`,
    ...(input.toolInput ?? {})
  };
  const timeoutMs = Math.max(1_000, Math.min(tool.timeoutMs, MAX_TOOL_TIMEOUT_MS));

  return {
    toolId: tool.id,
    tool: tool.name,
    executorType: "bash",
    capabilities: [...tool.capabilities],
    target: input.target,
    ...(input.port == null ? {} : { port: input.port }),
    layer: input.layer,
    riskTier: tool.riskTier,
    justification: input.justification,
    sandboxProfile: deriveSandboxProfile(tool.riskTier),
    privilegeProfile: derivePrivilegeProfile(tool.riskTier),
    parameters: {
      bashSource: tool.bashSource,
      timeoutMs,
      commandPreview: interpolateArgument(`${tool.name} target=${toolInput.target} baseUrl=${toolInput.baseUrl}`, {
        ...input,
        toolInput
      }),
      toolInput
    }
  };
}
