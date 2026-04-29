import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("loadFixedAiRuntime", () => {
  afterEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("defaults local runtime API mode to chat", async () => {
    process.env["LLM_PROVIDER"] = "local";
    process.env["LLM_LOCAL_BASE_URL"] = "http://localhost:11434/v1";
    process.env["LLM_LOCAL_MODEL"] = "qwen3:1.7b";

    const { loadFixedAiRuntime } = await import("./fixed-ai-runtime.js");
    const runtime = loadFixedAiRuntime();

    expect(runtime.provider).toBe("local");
    if (runtime.provider === "local") {
      expect(runtime.apiMode).toBe("chat");
    }
  }, 15000);

  it("supports overriding local runtime API mode through env", async () => {
    process.env["LLM_PROVIDER"] = "local";
    process.env["LLM_LOCAL_BASE_URL"] = "http://localhost:11434/v1";
    process.env["LLM_LOCAL_MODEL"] = "qwen3:8b";
    process.env["LLM_LOCAL_OPENAI_API_MODE"] = "responses";

    const { loadFixedAiRuntime } = await import("./fixed-ai-runtime.js");
    const runtime = loadFixedAiRuntime();

    expect(runtime.provider).toBe("local");
    if (runtime.provider === "local") {
      expect(runtime.apiMode).toBe("responses");
    }
  });

  it("prefers CLAUDE_MODEL over the legacy Anthropic model env", async () => {
    process.env["LLM_PROVIDER"] = "anthropic";
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    process.env["CLAUDE_MODEL"] = "claude-sonnet-4-6";
    process.env["LLM_ANTHROPIC_MODEL"] = "claude-haiku-4-5";

    const { loadFixedAiRuntime } = await import("./fixed-ai-runtime.js");
    const runtime = loadFixedAiRuntime();

    expect(runtime.provider).toBe("anthropic");
    if (runtime.provider === "anthropic") {
      expect(runtime.model).toBe("claude-sonnet-4-6");
      expect(runtime.label).toBe("Anthropic · claude-sonnet-4-6");
    }
  });
});
