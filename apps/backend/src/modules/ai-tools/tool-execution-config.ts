import type {
  AiTool,
  CreateAiToolBody,
  ToolPrivilegeProfile,
  ToolRiskTier,
  ToolSandboxProfile,
  UpdateAiToolBody
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";

const EXECUTION_KEY = "x-synosec-runtime";

type JsonRecord = Record<string, unknown>;

interface StoredExecutionConfig {
  executorType?: "bash";
  bashSource?: string;
  sandboxProfile?: ToolSandboxProfile;
  privilegeProfile?: ToolPrivilegeProfile;
  timeoutMs?: AiTool["timeoutMs"];
  capabilities?: AiTool["capabilities"];
  constraintProfile?: AiTool["constraintProfile"];
}

export type ToolExecutionFields = {
  executorType: "bash";
  bashSource: string;
  sandboxProfile: ToolSandboxProfile;
  privilegeProfile: ToolPrivilegeProfile;
  timeoutMs: AiTool["timeoutMs"];
  capabilities: AiTool["capabilities"];
  constraintProfile?: AiTool["constraintProfile"];
};

type ExecutionConfigLookup = Pick<AiTool, "id" | "name" | "category" | "riskTier"> & {
  capabilities?: string[];
};

const categoryCapabilities: Record<AiTool["category"], string[]> = {
  network: ["network-recon"],
  web: ["web-recon"],
  content: ["content-discovery"],
  dns: ["dns-recon"],
  subdomain: ["subdomain-recon"],
  password: ["password-audit"],
  cloud: ["cloud-audit"],
  kubernetes: ["kubernetes-audit"],
  windows: ["windows-enum"],
  forensics: ["forensics-analysis"],
  reversing: ["binary-analysis"],
  exploitation: ["exploit-validation"],
  utility: ["utility"],
  topology: ["topology-analysis"],
  auth: ["auth-audit"]
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
    legacyConfigNormalized.sandboxProfile = legacyConfig["sandboxProfile"] as ToolSandboxProfile;
  }
  if (legacyConfig["privilegeProfile"] != null) {
    legacyConfigNormalized.privilegeProfile = legacyConfig["privilegeProfile"] as ToolPrivilegeProfile;
  }
  if (typeof legacyConfig["timeoutMs"] === "number") {
    legacyConfigNormalized.timeoutMs = legacyConfig["timeoutMs"];
  }
  if (Array.isArray(legacyConfig["capabilities"])) {
    legacyConfigNormalized.capabilities = legacyConfig["capabilities"].filter((value): value is string => typeof value === "string");
  }
  if (legacyConfig["constraintProfile"] && typeof legacyConfig["constraintProfile"] === "object" && !Array.isArray(legacyConfig["constraintProfile"])) {
    legacyConfigNormalized.constraintProfile = legacyConfig["constraintProfile"] as AiTool["constraintProfile"];
  }
  if (legacyConfigNormalized.bashSource) {
    legacyConfigNormalized.executorType = "bash";
  }
  return legacyConfigNormalized;
}

function isCompleteExecutionConfig(config: StoredExecutionConfig): config is Omit<ToolExecutionFields, "sandboxProfile" | "privilegeProfile"> & StoredExecutionConfig {
  return (
    config.executorType === "bash"
    && typeof config.bashSource === "string"
    && config.bashSource.trim().length > 0
    && typeof config.timeoutMs === "number"
  );
}

export function deriveSandboxProfile(riskTier: ToolRiskTier): ToolSandboxProfile {
  if (riskTier === "controlled-exploit") {
    return "controlled-exploit-lab";
  }
  if (riskTier === "active") {
    return "active-recon";
  }

  return "network-recon";
}

export function derivePrivilegeProfile(riskTier: ToolRiskTier): ToolPrivilegeProfile {
  if (riskTier === "controlled-exploit") {
    return "controlled-exploit";
  }
  if (riskTier === "active") {
    return "active-network";
  }

  return "read-only-network";
}

function deriveExecutionPolicy(riskTier: ToolRiskTier) {
  return {
    sandboxProfile: deriveSandboxProfile(riskTier),
    privilegeProfile: derivePrivilegeProfile(riskTier)
  };
}

export function deriveCapabilities(category: AiTool["category"]) {
  return [...(categoryCapabilities[category] ?? [`${category}-tool`])];
}

function getSeededExecutionConfig(toolId: string) {
  return seededToolDefinitions.find((candidate) => candidate.id === toolId) ?? null;
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
      capabilities: tool.capabilities,
      ...(tool.constraintProfile ? { constraintProfile: tool.constraintProfile } : {})
    }
  };
  delete next["x-synosec-execution"];
  return next as T;
}

export function mapToolExecutionFields(
  tool: Pick<AiTool, "riskTier" | "category">,
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
    ...deriveExecutionPolicy(tool.riskTier),
    timeoutMs: stored.timeoutMs,
    capabilities: Array.isArray(stored.capabilities)
      ? (stored.capabilities.filter((value): value is string => typeof value === "string").length > 0
          ? stored.capabilities.filter((value): value is string => typeof value === "string")
          : deriveCapabilities(tool.category))
      : deriveCapabilities(tool.category),
    ...(stored.constraintProfile ? { constraintProfile: stored.constraintProfile } : {})
  };
}

export function resolveToolExecutionFields(tool: ExecutionConfigLookup, inputSchema: unknown): ToolExecutionFields {
  try {
    const mapped = mapToolExecutionFields(tool, inputSchema);
    if (mapped.constraintProfile) {
      return mapped;
    }

    const seeded = getSeededExecutionConfig(tool.id);
    if (!seeded?.constraintProfile) {
      return mapped;
    }

    return {
      ...mapped,
      constraintProfile: seeded.constraintProfile
    };
  } catch (error) {
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
  const capabilities = deriveCapabilities(input.category);
  return {
    ...input,
    inputSchema: attachExecutionConfig(input.inputSchema, {
      executorType: input.executorType,
      bashSource: input.bashSource,
      ...deriveExecutionPolicy(input.riskTier),
      timeoutMs: input.timeoutMs,
      capabilities,
      ...(input.constraintProfile ? { constraintProfile: input.constraintProfile } : {})
    })
  };
}

export function encodeUpdateToolInput(input: UpdateAiToolBody, current: AiTool) {
  const shouldRewriteExecutionConfig = (
    input.inputSchema !== undefined ||
    input.executorType !== undefined ||
    input.bashSource !== undefined ||
    input.riskTier !== undefined ||
    input.timeoutMs !== undefined ||
    input.category !== undefined ||
    input.constraintProfile !== undefined
  );

  return {
    ...input,
    inputSchema: !shouldRewriteExecutionConfig
      ? undefined
      : attachExecutionConfig(input.inputSchema ?? current.inputSchema, {
          executorType: "bash",
          bashSource: input.bashSource ?? current.bashSource ?? "",
          ...deriveExecutionPolicy(input.riskTier ?? current.riskTier),
          timeoutMs: input.timeoutMs ?? current.timeoutMs,
          capabilities: deriveCapabilities(input.category ?? current.category),
          ...(input.constraintProfile ?? current.constraintProfile
            ? { constraintProfile: input.constraintProfile ?? current.constraintProfile }
            : {})
        })
  };
}
