import { runtimeProviderSchema, type RuntimeProvider } from "@synosec/contracts";
import { z } from "zod";
import { RequestError } from "@/shared/http/request-error.js";
import "@/shared/config/load-env.js";

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_LOCAL_MODEL = "qwen3:8b";
const DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1";

const configuredRuntimeEnvSchema = z.object({
  provider: runtimeProviderSchema.default("anthropic"),
  anthropicApiKey: z.string().trim().min(1).optional(),
  anthropicModel: z.string().trim().min(1).default(DEFAULT_ANTHROPIC_MODEL),
  localBaseUrl: z.string().trim().url().default(DEFAULT_LOCAL_BASE_URL),
  localModel: z.string().trim().min(1).default(DEFAULT_LOCAL_MODEL)
});

type ConfiguredRuntimeEnv = z.infer<typeof configuredRuntimeEnvSchema>;

export type FixedAiRuntime =
  | {
      provider: "anthropic";
      providerName: string;
      model: string;
      label: string;
      apiKey: string;
    }
  | {
      provider: "local";
      providerName: string;
      model: string;
      label: string;
      baseUrl: string;
      apiKey: string;
    };

export function formatRuntimeLabel(providerName: string, model: string) {
  return `${providerName} · ${model}`;
}

export function loadFixedAiRuntime(): FixedAiRuntime {
  const env = configuredRuntimeEnvSchema.parse({
    provider: process.env["LLM_PROVIDER"] ?? "anthropic",
    anthropicApiKey: process.env["ANTHROPIC_API_KEY"],
    anthropicModel: process.env["LLM_ANTHROPIC_MODEL"] ?? DEFAULT_ANTHROPIC_MODEL,
    localBaseUrl: normalizeLocalBaseUrl(process.env["LLM_LOCAL_BASE_URL"] ?? DEFAULT_LOCAL_BASE_URL),
    localModel: process.env["LLM_LOCAL_MODEL"] ?? DEFAULT_LOCAL_MODEL
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
    apiKey: env.anthropicApiKey
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
    apiKey: "ollama"
  };
}

function normalizeLocalBaseUrl(value: string) {
  return value.endsWith("/v1") ? value : `${value.replace(/\/+$/, "")}/v1`;
}

export function isRuntimeProvider(value: string): value is RuntimeProvider {
  return runtimeProviderSchema.safeParse(value).success;
}
