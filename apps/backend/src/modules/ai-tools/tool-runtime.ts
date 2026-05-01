import type { AiTool, ToolCapabilitiesResponse, ToolRequest } from "@synosec/contracts";
import { getToolCapabilities } from "@/engine/tools/tool-catalog.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { AiToolsRepository } from "./ai-tools.repository.js";
import { compileToolRequestFromDefinition, type CompileInput } from "./tool-definition.compiler.js";
import {
  getNativeToolImplementation,
  type NativeToolImplementation
} from "./native-tools/index.js";
import {
  derivePrivilegeProfile,
  deriveSandboxProfile,
  type ToolExecutionFields
} from "./tool-execution-config.js";

export type ResolvedAiTool = {
  tool: AiTool;
  runtime: ToolExecutionFields | NativeToolRuntimeFields | null;
};

export type NativeToolRuntimeFields = {
  executorType: "native-ts";
  implementation: NativeToolImplementation;
  sandboxProfile: ReturnType<typeof deriveSandboxProfile>;
  privilegeProfile: ReturnType<typeof derivePrivilegeProfile>;
  timeoutMs: AiTool["timeoutMs"];
  capabilities: string[];
  constraintProfile?: AiTool["constraintProfile"];
};

type ToolCapabilityInspector = () => Promise<ToolCapabilitiesResponse>;

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getRuntime(tool: AiTool): ToolExecutionFields | NativeToolRuntimeFields | null {
  if (tool.executorType === "native-ts") {
    const implementation = getNativeToolImplementation(tool.id);
    if (!implementation) {
      return null;
    }

    return {
      executorType: "native-ts",
      implementation,
      sandboxProfile: deriveSandboxProfile(tool.riskTier),
      privilegeProfile: derivePrivilegeProfile(tool.riskTier),
      timeoutMs: tool.timeoutMs,
      capabilities: [...tool.capabilities],
      ...(tool.constraintProfile ? { constraintProfile: tool.constraintProfile } : {})
    };
  }

  if (tool.executorType !== "bash" || !tool.bashSource) {
    return null;
  }

  return {
    executorType: "bash",
    bashSource: tool.bashSource,
    sandboxProfile: deriveSandboxProfile(tool.riskTier),
    privilegeProfile: derivePrivilegeProfile(tool.riskTier),
    timeoutMs: tool.timeoutMs,
    capabilities: [...tool.capabilities],
    ...(tool.constraintProfile ? { constraintProfile: tool.constraintProfile } : {})
  };
}

export class ToolRuntime {
  constructor(
    private readonly repository: AiToolsRepository,
    private readonly inspectCapabilities: ToolCapabilityInspector = getToolCapabilities
  ) {}

  async get(id: string): Promise<ResolvedAiTool | null> {
    const tool = await this.repository.getById(id);
    if (!tool) {
      return null;
    }

    return {
      tool,
      runtime: getRuntime(tool)
    };
  }

  async resolveByName(name: string): Promise<ResolvedAiTool[]> {
    const normalizedName = normalizeName(name);
    const result = await this.repository.list({
      page: 1,
      pageSize: 100,
      q: "",
      sortBy: "name",
      sortDirection: "asc"
    });

    const matches = result.items.filter((tool) => normalizeName(tool.name) === normalizedName);
    return Promise.all(matches.map(async (tool) => {
      const resolved = await this.get(tool.id);
      if (!resolved) {
        throw new RequestError(404, `AI tool not found: ${tool.id}.`, {
          code: "AI_TOOL_NOT_FOUND",
          userFriendlyMessage: "The selected AI tool no longer exists."
        });
      }

      return resolved;
    }));
  }

  async compile(id: string, input: CompileInput): Promise<ToolRequest> {
    const resolved = await this.get(id);
    if (!resolved) {
      throw new RequestError(404, `AI tool not found: ${id}.`, {
        code: "AI_TOOL_NOT_FOUND",
        userFriendlyMessage: "The selected AI tool was not found."
      });
    }

    if (!resolved.runtime) {
      throw new RequestError(400, `${resolved.tool.name} is a built-in action and cannot be compiled for bash execution.`, {
        code: "AI_TOOL_BUILTIN_NOT_RUNNABLE",
        userFriendlyMessage: "Built-in AI tools cannot be run through bash execution."
      });
    }

    if (resolved.runtime.executorType !== "bash") {
      throw new RequestError(400, `${resolved.tool.name} is a native TypeScript tool and cannot be compiled for bash execution.`, {
        code: "AI_TOOL_NATIVE_NOT_COMPILABLE",
        userFriendlyMessage: "Native AI tools do not compile to bash."
      });
    }

    return compileToolRequestFromDefinition({
      id: resolved.tool.id,
      name: resolved.tool.name,
      executorType: resolved.runtime.executorType,
      bashSource: resolved.runtime.bashSource,
      riskTier: resolved.tool.riskTier,
      timeoutMs: resolved.runtime.timeoutMs,
      capabilities: resolved.runtime.capabilities
    }, input);
  }

  async listCapabilities(): Promise<ToolCapabilitiesResponse> {
    return this.inspectCapabilities();
  }
}

export function createToolRuntime(repository: AiToolsRepository) {
  return new ToolRuntime(repository);
}
