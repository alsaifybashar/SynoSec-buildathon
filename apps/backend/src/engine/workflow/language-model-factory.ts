import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { FixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";

export function createLanguageModelFromRuntime(runtime: FixedAiRuntime): LanguageModel {
  if (runtime.provider === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: runtime.apiKey
    });

    return anthropic(runtime.model);
  }

  const openai = createOpenAI({
    baseURL: runtime.baseUrl,
    apiKey: runtime.apiKey,
    name: "ollama"
  });

  return runtime.apiMode === "responses"
    ? openai.responses(runtime.model)
    : openai.chat(runtime.model);
}
