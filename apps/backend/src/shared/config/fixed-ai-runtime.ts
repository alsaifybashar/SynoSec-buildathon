import { runtimeProviderSchema, type RuntimeProvider } from "@synosec/contracts";
import { z } from "zod";
import { RequestError } from "@/shared/http/request-error.js";
import "@/shared/config/load-env.js";

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_ANTHROPIC_PROMPT_CACHING_TTL = "1h";
const DEFAULT_LOCAL_MODEL = "qwen3:8b";
const DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1";

const configuredRuntimeEnvSchema = z.object({
  provider: runtimeProviderSchema.default("anthropic"),
  anthropicApiKey: z.string().trim().min(1).optional(),
  anthropicModel: z.string().trim().min(1).default(DEFAULT_ANTHROPIC_MODEL),
  anthropicPromptCachingEnabled: z.boolean().default(true),
  anthropicPromptCachingTtl: z.enum(["5m", "1h"]).default(DEFAULT_ANTHROPIC_PROMPT_CACHING_TTL),
  localBaseUrl: z.string().trim().url().default(DEFAULT_LOCAL_BASE_URL),
  localModel: z.string().trim().min(1).default(DEFAULT_LOCAL_MODEL),
  localOpenAiApiMode: z.enum(["chat", "responses"]).default("chat")
});

type ConfiguredRuntimeEnv = z.infer<typeof configuredRuntimeEnvSchema>;

export type FixedAiRuntime =
  | {
      provider: "anthropic";
      providerName: string;
      model: string;
      label: string;
      apiKey: string;
      promptCachingEnabled: boolean;
      promptCachingTtl: "5m" | "1h";
    }
  | {
      provider: "local";
      providerName: string;
      model: string;
      label: string;
      baseUrl: string;
      apiKey: string;
      apiMode: "chat" | "responses";
    };

export function formatRuntimeLabel(providerName: string, model: string) {
  return `${providerName} · ${model}`;
}

export function loadFixedAiRuntime(): FixedAiRuntime {
  const env = configuredRuntimeEnvSchema.parse({
    provider: process.env["LLM_PROVIDER"] ?? "anthropic",
    anthropicApiKey: process.env["ANTHROPIC_API_KEY"],
    anthropicModel:
      process.env["CLAUDE_MODEL"]
      ?? process.env["LLM_ANTHROPIC_MODEL"]
      ?? DEFAULT_ANTHROPIC_MODEL,
    anthropicPromptCachingEnabled: parsePromptCachingEnabled(process.env["ANTHROPIC_PROMPT_CACHING_ENABLED"]),
    anthropicPromptCachingTtl: process.env["ANTHROPIC_PROMPT_CACHING_TTL"] ?? DEFAULT_ANTHROPIC_PROMPT_CACHING_TTL,
    localBaseUrl: normalizeLocalBaseUrl(process.env["LLM_LOCAL_BASE_URL"] ?? DEFAULT_LOCAL_BASE_URL),
    localModel: process.env["LLM_LOCAL_MODEL"] ?? DEFAULT_LOCAL_MODEL,
    localOpenAiApiMode: process.env["LLM_LOCAL_OPENAI_API_MODE"] ?? "chat"
  });

  return env.provider === "anthropic"
    ? loadAnthropicRuntime(env)
    : loadLocalRuntime(env);
}

function loadAnthropicRuntime(env: ConfiguredRuntimeEnv): FixedAiRuntime {
  if (!env.anthropicApiKey) {
    throw new RequestError(400, "Anthropic execution requires ANTHROPIC_API_KEY.");
  }

  return {
    provider: "anthropic",
    providerName: "Anthropic",
    model: env.anthropicModel,
    label: formatRuntimeLabel("Anthropic", env.anthropicModel),
    apiKey: env.anthropicApiKey,
    promptCachingEnabled: env.anthropicPromptCachingEnabled,
    promptCachingTtl: env.anthropicPromptCachingTtl
  };
}

function loadLocalRuntime(env: ConfiguredRuntimeEnv): FixedAiRuntime {
  if (!env.localBaseUrl) {
    throw new RequestError(400, "Local execution requires LLM_LOCAL_BASE_URL.");
  }

  if (!env.localModel) {
    throw new RequestError(400, "Local execution requires LLM_LOCAL_MODEL.");
  }

  return {
    provider: "local",
    providerName: "Ollama",
    model: env.localModel,
    label: formatRuntimeLabel("Ollama", env.localModel),
    baseUrl: env.localBaseUrl,
    apiKey: "ollama",
    apiMode: env.localOpenAiApiMode
  };
}

function normalizeLocalBaseUrl(value: string) {
  return value.endsWith("/v1") ? value : `${value.replace(/\/+$/, "")}/v1`;
}

function parsePromptCachingEnabled(value: string | undefined) {
  if (value === undefined) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  throw new RequestError(400, "ANTHROPIC_PROMPT_CACHING_ENABLED must be true or false.");
}

export function isRuntimeProvider(value: string): value is RuntimeProvider {
  return runtimeProviderSchema.safeParse(value).success;
}
