import type {
  AiTool,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";

const EXECUTION_KEY = "x-synosec-runtime";

type JsonRecord = Record<string, unknown>;

interface StoredExecutionConfig {
  executorType?: "bash";
  bashSource?: string;
  sandboxProfile?: AiTool["sandboxProfile"];
  privilegeProfile?: AiTool["privilegeProfile"];
  timeoutMs?: AiTool["timeoutMs"];
  capabilities?: AiTool["capabilities"];
}

type ToolExecutionFields = {
  executorType: "bash";
  bashSource: string;
  sandboxProfile: AiTool["sandboxProfile"];
  privilegeProfile: AiTool["privilegeProfile"];
  timeoutMs: AiTool["timeoutMs"];
  capabilities: AiTool["capabilities"];
};

type ExecutionConfigLookup = Pick<AiTool, "id" | "name" | "category" | "riskTier"> & {
  binary?: string | null;
};

function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function readStoredExecutionConfig(schema: unknown): StoredExecutionConfig {
  const record = asJsonRecord(schema);
  const runtimeConfig = asJsonRecord(record[EXECUTION_KEY]);
  if (Object.keys(runtimeConfig).length > 0) {
    return runtimeConfig;
  }

  const legacyConfig = asJsonRecord(record["x-synosec-execution"]);
  const legacyConfigNormalized: StoredExecutionConfig = {};
  if (typeof legacyConfig["scriptSource"] === "string") {
    legacyConfigNormalized.bashSource = legacyConfig["scriptSource"];
  }
  if (legacyConfig["sandboxProfile"] != null) {
    legacyConfigNormalized.sandboxProfile = legacyConfig["sandboxProfile"] as AiTool["sandboxProfile"];
  }
  if (legacyConfig["privilegeProfile"] != null) {
    legacyConfigNormalized.privilegeProfile = legacyConfig["privilegeProfile"] as AiTool["privilegeProfile"];
  }
  if (typeof legacyConfig["timeoutMs"] === "number") {
    legacyConfigNormalized.timeoutMs = legacyConfig["timeoutMs"];
  }
  if (Array.isArray(legacyConfig["capabilities"])) {
    legacyConfigNormalized.capabilities = legacyConfig["capabilities"].filter((value): value is string => typeof value === "string");
  }
  if (legacyConfigNormalized.bashSource) {
    legacyConfigNormalized.executorType = "bash";
  }
  return legacyConfigNormalized;
}

function isCompleteExecutionConfig(config: StoredExecutionConfig): config is ToolExecutionFields {
  return (
    config.executorType === "bash"
    && typeof config.bashSource === "string"
    && config.bashSource.trim().length > 0
    && !!config.sandboxProfile
    && !!config.privilegeProfile
    && typeof config.timeoutMs === "number"
  );
}

function defaultSandboxProfile(tool: Pick<AiTool, "category" | "riskTier">): AiTool["sandboxProfile"] {
  if (tool.riskTier === "controlled-exploit") {
    return "controlled-exploit-lab";
  }
  if (tool.riskTier === "active") {
    return "active-recon";
  }
  if (tool.category === "utility" || tool.category === "forensics" || tool.category === "reversing") {
    return "read-only-parser";
  }

  return "network-recon";
}

function defaultPrivilegeProfile(tool: Pick<AiTool, "riskTier">): AiTool["privilegeProfile"] {
  if (tool.riskTier === "controlled-exploit") {
    return "controlled-exploit";
  }
  if (tool.riskTier === "active") {
    return "active-network";
  }

  return "read-only-network";
}

function createLegacyFallbackBashSource(tool: ExecutionConfigLookup) {
  const detail = `The AI tool "${tool.name}" is missing runtime execution config and must be updated before it can run.`;

  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `detail=${JSON.stringify(detail)}`,
    "node -e '",
    "  const detail = process.argv[1];",
    "  console.log(JSON.stringify({",
    "    output: detail,",
    "    statusReason: \"Missing runtime execution config\"",
    "  }));",
    "' \"$detail\""
  ].join("\n");
}

function resolveFallbackExecutionConfig(tool: ExecutionConfigLookup): ToolExecutionFields {
  const seeded = seededToolDefinitions.find((candidate) => candidate.id === tool.id);
  if (seeded) {
    return {
      executorType: seeded.executorType,
      bashSource: seeded.bashSource,
      sandboxProfile: seeded.sandboxProfile,
      privilegeProfile: seeded.privilegeProfile,
      timeoutMs: seeded.timeoutMs,
      capabilities: [...seeded.capabilities]
    };
  }

  return {
    executorType: "bash",
    bashSource: createLegacyFallbackBashSource(tool),
    sandboxProfile: defaultSandboxProfile(tool),
    privilegeProfile: defaultPrivilegeProfile(tool),
    timeoutMs: 30000,
    capabilities: [tool.binary?.trim() || `${tool.category}-tool`]
  };
}

export function stripExecutionConfig<T>(schema: T): T {
  const record = asJsonRecord(schema);
  if (!(EXECUTION_KEY in record) && !("x-synosec-execution" in record)) {
    return schema;
  }
  const {
    [EXECUTION_KEY]: _runtimeIgnored,
    ["x-synosec-execution"]: _legacyIgnored,
    ...rest
  } = record;
  return rest as T;
}

export function attachExecutionConfig<T>(
  schema: T,
  tool: ToolExecutionFields
): T {
  const record = asJsonRecord(schema);
  const next: JsonRecord = {
    ...record,
    [EXECUTION_KEY]: {
      executorType: tool.executorType,
      bashSource: tool.bashSource,
      sandboxProfile: tool.sandboxProfile,
      privilegeProfile: tool.privilegeProfile,
      timeoutMs: tool.timeoutMs,
      capabilities: tool.capabilities
    }
  };
  delete next["x-synosec-execution"];
  return next as T;
}

export function mapToolExecutionFields(
  inputSchema: unknown
): ToolExecutionFields {
  const stored = readStoredExecutionConfig(inputSchema);
  if (!isCompleteExecutionConfig(stored)) {
    throw new RequestError(500, "This AI tool is missing required execution settings.", {
      code: "AI_TOOL_EXECUTION_CONFIG_MISSING",
      userFriendlyMessage: "This AI tool is missing required execution settings."
    });
  }

  return {
    executorType: "bash",
    bashSource: stored.bashSource,
    sandboxProfile: stored.sandboxProfile,
    privilegeProfile: stored.privilegeProfile,
    timeoutMs: stored.timeoutMs,
    capabilities: Array.isArray(stored.capabilities)
      ? stored.capabilities.filter((value): value is string => typeof value === "string")
      : []
  };
}

export function resolveToolExecutionFields(tool: ExecutionConfigLookup, inputSchema: unknown): ToolExecutionFields {
  try {
    return mapToolExecutionFields(inputSchema);
  } catch (error) {
    if (error instanceof RequestError && error.code === "AI_TOOL_EXECUTION_CONFIG_MISSING") {
      return resolveFallbackExecutionConfig(tool);
    }

    if (error instanceof RequestError) {
      const options = {
        ...(error.code ? { code: error.code } : {}),
        ...(error.userFriendlyMessage ? { userFriendlyMessage: error.userFriendlyMessage } : {}),
        cause: error
      };
      throw new RequestError(error.status, `${error.message} Tool: ${tool.name} (${tool.id}).`, {
        ...options
      });
    }

    throw error;
  }
}

export function encodeCreateToolInput(input: CreateAiToolBody) {
  return {
    ...input,
    inputSchema: attachExecutionConfig(input.inputSchema, {
      executorType: input.executorType,
      bashSource: input.bashSource,
      sandboxProfile: input.sandboxProfile,
      privilegeProfile: input.privilegeProfile,
      timeoutMs: input.timeoutMs,
      capabilities: input.capabilities
    })
  };
}

export function encodeUpdateToolInput(input: UpdateAiToolBody, current: AiTool) {
  const shouldRewriteExecutionConfig = (
    input.inputSchema !== undefined ||
    input.executorType !== undefined ||
    input.bashSource !== undefined ||
    input.sandboxProfile !== undefined ||
    input.privilegeProfile !== undefined ||
    input.timeoutMs !== undefined ||
    input.capabilities !== undefined
  );

  return {
    ...input,
    inputSchema: !shouldRewriteExecutionConfig
      ? undefined
      : attachExecutionConfig(input.inputSchema ?? current.inputSchema, {
          executorType: "bash",
          bashSource: input.bashSource ?? current.bashSource ?? "",
          sandboxProfile: input.sandboxProfile ?? current.sandboxProfile,
          privilegeProfile: input.privilegeProfile ?? current.privilegeProfile,
          timeoutMs: input.timeoutMs ?? current.timeoutMs,
          capabilities: input.capabilities ?? current.capabilities
        })
  };
}
