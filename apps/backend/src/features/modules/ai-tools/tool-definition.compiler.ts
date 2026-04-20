import type { AiTool, OsiLayer, ToolRequest } from "@synosec/contracts";

type CompilableTool = Pick<
  AiTool,
  "id" | "name" | "scriptPath" | "executionMode" | "riskTier" | "sandboxProfile" | "privilegeProfile" | "timeoutMs"
> & {
  capabilities: readonly string[];
  defaultArgs: readonly string[];
};

interface CompileInput {
  target: string;
  layer: OsiLayer;
  justification: string;
  port?: number;
}

function interpolateArgument(template: string, input: CompileInput): string {
  const baseUrl = `http://${input.target}${input.port ? `:${input.port}` : ""}`;
  return template
    .replaceAll("{target}", input.target)
    .replaceAll("{baseUrl}", baseUrl)
    .replaceAll("{port}", input.port == null ? "" : String(input.port));
}

export function compileToolRequestFromDefinition(tool: CompilableTool, input: CompileInput): ToolRequest {
  if (
    tool.executionMode !== "sandboxed"
    || !tool.sandboxProfile
    || !tool.privilegeProfile
    || !tool.scriptPath
    || tool.capabilities.length === 0
  ) {
    throw new Error(`Tool ${tool.id} is not configured for sandboxed execution.`);
  }

  return {
    toolId: tool.id,
    tool: tool.name,
    scriptPath: tool.scriptPath,
    capabilities: [...tool.capabilities],
    target: input.target,
    ...(input.port == null ? {} : { port: input.port }),
    layer: input.layer,
    riskTier: tool.riskTier,
    justification: input.justification,
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    parameters: {
      scriptPath: tool.scriptPath,
      scriptArgs: [...tool.defaultArgs].map((argument) => interpolateArgument(argument, input)),
      ...(tool.timeoutMs == null ? {} : { timeoutMs: tool.timeoutMs })
    }
  };
}
