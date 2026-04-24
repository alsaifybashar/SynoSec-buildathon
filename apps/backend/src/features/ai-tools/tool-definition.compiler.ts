import type { AiTool, OsiLayer, ToolRequest } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";

type CompilableTool = Pick<
  AiTool,
  "id" | "name" | "executorType" | "bashSource" | "riskTier" | "sandboxProfile" | "privilegeProfile" | "timeoutMs"
> & {
  capabilities: readonly string[];
};

interface CompileInput {
  target: string;
  layer: OsiLayer;
  justification: string;
  port?: number;
  toolInput?: Record<string, string | number | boolean | string[]>;
}

function interpolateArgument(template: string, input: CompileInput): string {
  const baseUrl = `http://${input.target}${input.port ? `:${input.port}` : ""}`;
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

  const toolInput = {
    ...(input.toolInput ?? {}),
    target: input.target,
    ...(input.port == null ? {} : { port: input.port }),
    baseUrl: `http://${input.target}${input.port ? `:${input.port}` : ""}`
  };

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
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    parameters: {
      bashSource: tool.bashSource,
      timeoutMs: tool.timeoutMs,
      commandPreview: interpolateArgument(`${tool.name} target=${toolInput.target} baseUrl=${toolInput.baseUrl}`, {
        ...input,
        toolInput
      }),
      toolInput
    }
  };
}
