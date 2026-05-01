import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";
import { createLanguageModelFromRuntime } from "@/engine/workflow/language-model-factory.js";

const {
  anthropicModel,
  openAiChatModel,
  openAiResponsesModel,
  anthropicFactory,
  openAiChatFactory,
  openAiResponsesFactory,
  openAiProviderFactory
} = vi.hoisted(() => ({
  anthropicModel: { provider: "anthropic-model" },
  openAiChatModel: { provider: "openai-chat-model" },
  openAiResponsesModel: { provider: "openai-responses-model" },
  anthropicFactory: vi.fn(() => vi.fn(() => ({ provider: "anthropic-model" }))),
  openAiChatFactory: vi.fn(() => ({ provider: "openai-chat-model" })),
  openAiResponsesFactory: vi.fn(() => ({ provider: "openai-responses-model" })),
  openAiProviderFactory: vi.fn(() => ({
    chat: openAiChatFactory,
    responses: openAiResponsesFactory
  }))
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: anthropicFactory
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: openAiProviderFactory
}));

describe("createLanguageModelFromRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the OpenAI chat API path for local chat mode", () => {
    const runtime: FixedAiRuntime = {
      provider: "local",
      providerName: "Ollama",
      model: "qwen3:1.7b",
      label: "Ollama · qwen3:1.7b",
      baseUrl: "http://localhost:11434/v1",
      apiKey: "ollama",
      apiMode: "chat"
    };

    const result = createLanguageModelFromRuntime(runtime);

    expect(openAiProviderFactory).toHaveBeenCalledWith({
      baseURL: "http://localhost:11434/v1",
      apiKey: "ollama",
      name: "ollama"
    });
    expect(openAiChatFactory).toHaveBeenCalledWith("qwen3:1.7b");
    expect(openAiResponsesFactory).not.toHaveBeenCalled();
    expect(result).toStrictEqual(openAiChatModel);
  });

  it("uses the OpenAI responses API path for local responses mode", () => {
    const runtime: FixedAiRuntime = {
      provider: "local",
      providerName: "Ollama",
      model: "qwen3:8b",
      label: "Ollama · qwen3:8b",
      baseUrl: "http://localhost:11434/v1",
      apiKey: "ollama",
      apiMode: "responses"
    };

    const result = createLanguageModelFromRuntime(runtime);

    expect(openAiResponsesFactory).toHaveBeenCalledWith("qwen3:8b");
    expect(openAiChatFactory).not.toHaveBeenCalled();
    expect(result).toStrictEqual(openAiResponsesModel);
  });

  it("uses Anthropic directly for hosted runtime", () => {
    const anthropicModelFactory = vi.fn(() => anthropicModel);
    anthropicFactory.mockReturnValueOnce(anthropicModelFactory);
    const runtime: FixedAiRuntime = {
      provider: "anthropic",
      providerName: "Anthropic",
      model: "claude-haiku-4-5",
      label: "Anthropic · claude-haiku-4-5",
      apiKey: "test-key",
      promptCachingEnabled: true,
      promptCachingTtl: "1h"
    };

    const result = createLanguageModelFromRuntime(runtime);

    expect(anthropicFactory).toHaveBeenCalledWith({
      apiKey: "test-key"
    });
    expect(anthropicModelFactory).toHaveBeenCalledWith("claude-haiku-4-5");
    expect(result).toBe(anthropicModel);
  });
});
