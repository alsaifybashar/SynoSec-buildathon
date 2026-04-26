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
  });

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
});
