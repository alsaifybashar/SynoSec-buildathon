import type {
  AiTool,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";

const EXECUTION_KEY = "x-synosec-execution";

type JsonRecord = Record<string, unknown>;

interface StoredExecutionConfig {
  executionMode?: AiTool["executionMode"];
  sandboxProfile?: AiTool["sandboxProfile"];
  privilegeProfile?: AiTool["privilegeProfile"];
  defaultArgs?: AiTool["defaultArgs"];
  timeoutMs?: AiTool["timeoutMs"];
  scriptPath?: AiTool["scriptPath"];
  scriptVersion?: AiTool["scriptVersion"];
  scriptSource?: AiTool["scriptSource"];
  capabilities?: AiTool["capabilities"];
}

function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function readStoredExecutionConfig(schema: unknown): StoredExecutionConfig {
  const record = asJsonRecord(schema);
  return asJsonRecord(record[EXECUTION_KEY]);
}

export function stripExecutionConfig<T>(schema: T): T {
  const record = asJsonRecord(schema);
  if (!(EXECUTION_KEY in record)) {
    return schema;
  }
  const { [EXECUTION_KEY]: _ignored, ...rest } = record;
  return rest as T;
}

export function attachExecutionConfig<T>(
  schema: T,
  tool: Pick<AiTool, "executionMode" | "sandboxProfile" | "privilegeProfile" | "defaultArgs" | "timeoutMs" | "scriptPath" | "scriptVersion" | "scriptSource" | "capabilities">
): T {
  const record = asJsonRecord(schema);
  const next: JsonRecord = {
    ...record,
    [EXECUTION_KEY]: {
      executionMode: tool.executionMode,
      sandboxProfile: tool.sandboxProfile,
      privilegeProfile: tool.privilegeProfile,
      defaultArgs: tool.defaultArgs,
      timeoutMs: tool.timeoutMs,
      scriptPath: tool.scriptPath,
      scriptVersion: tool.scriptVersion,
      scriptSource: tool.scriptSource,
      capabilities: tool.capabilities
    }
  };
  return next as T;
}

export function mapToolExecutionFields(
  inputSchema: unknown
): Pick<AiTool, "executionMode" | "sandboxProfile" | "privilegeProfile" | "defaultArgs" | "timeoutMs" | "scriptPath" | "scriptVersion" | "scriptSource" | "capabilities"> {
  const stored = readStoredExecutionConfig(inputSchema);
  return {
    executionMode: stored.executionMode === "sandboxed" ? "sandboxed" : "catalog",
    sandboxProfile: stored.sandboxProfile ?? null,
    privilegeProfile: stored.privilegeProfile ?? null,
    defaultArgs: Array.isArray(stored.defaultArgs) ? stored.defaultArgs.filter((value): value is string => typeof value === "string") : [],
    timeoutMs: typeof stored.timeoutMs === "number" ? stored.timeoutMs : null,
    scriptPath: typeof stored.scriptPath === "string" ? stored.scriptPath : null,
    scriptVersion: typeof stored.scriptVersion === "string" ? stored.scriptVersion : null,
    scriptSource: typeof stored.scriptSource === "string" ? stored.scriptSource : null,
    capabilities: Array.isArray(stored.capabilities) ? stored.capabilities.filter((value): value is string => typeof value === "string") : []
  };
}

export function encodeCreateToolInput(input: CreateAiToolBody) {
  return {
    ...input,
    inputSchema: attachExecutionConfig(input.inputSchema, {
      executionMode: input.executionMode,
      sandboxProfile: input.sandboxProfile ?? null,
      privilegeProfile: input.privilegeProfile ?? null,
      defaultArgs: input.defaultArgs,
      timeoutMs: input.timeoutMs ?? null,
      scriptPath: input.scriptPath ?? null,
      scriptVersion: input.scriptVersion ?? null,
      scriptSource: input.scriptSource ?? null,
      capabilities: input.capabilities
    })
  };
}

export function encodeUpdateToolInput(input: UpdateAiToolBody, current: AiTool) {
  const shouldRewriteExecutionConfig = (
    input.inputSchema !== undefined ||
    input.executionMode !== undefined ||
    input.sandboxProfile !== undefined ||
    input.privilegeProfile !== undefined ||
    input.defaultArgs !== undefined ||
    input.timeoutMs !== undefined ||
    input.scriptPath !== undefined ||
    input.scriptVersion !== undefined ||
    input.scriptSource !== undefined ||
    input.capabilities !== undefined
  );

  return {
    ...input,
    inputSchema: !shouldRewriteExecutionConfig
      ? undefined
      : attachExecutionConfig(input.inputSchema ?? current.inputSchema, {
          executionMode: input.executionMode ?? current.executionMode,
          sandboxProfile: input.sandboxProfile === undefined ? current.sandboxProfile : input.sandboxProfile ?? null,
          privilegeProfile: input.privilegeProfile === undefined ? current.privilegeProfile : input.privilegeProfile ?? null,
          defaultArgs: input.defaultArgs ?? current.defaultArgs,
          timeoutMs: input.timeoutMs === undefined ? current.timeoutMs : input.timeoutMs ?? null,
          scriptPath: input.scriptPath === undefined ? current.scriptPath : input.scriptPath ?? null,
          scriptVersion: input.scriptVersion === undefined ? current.scriptVersion : input.scriptVersion ?? null,
          scriptSource: input.scriptSource === undefined ? current.scriptSource : input.scriptSource ?? null,
          capabilities: input.capabilities ?? current.capabilities
        })
  };
}
