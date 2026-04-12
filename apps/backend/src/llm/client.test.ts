import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLocalRequestBody, createLlmClient, extractLocalText, resolveLlmConfig } from "./client.js";

describe("llm client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["LLM_PROVIDER"];
    delete process.env["LLM_LOCAL_BASE_URL"];
    delete process.env["LLM_LOCAL_API_PATH"];
    delete process.env["LLM_LOCAL_MODEL"];
    delete process.env["LLM_LOCAL_TIMEOUT_MS"];
  });

  it("extracts answer text from the local raw chat payload", () => {
    expect(extractLocalText({ answer: "{\"ok\":true}" })).toBe("{\"ok\":true}");
  });

  it("extracts answer text from OpenAI-compatible payloads", () => {
    expect(
      extractLocalText({
        choices: [{ message: { content: "{\"findings\":[]}" } }]
      })
    ).toBe("{\"findings\":[]}");
  });

  it("resolves local config from request overrides", () => {
    const resolved = resolveLlmConfig({
      provider: "local",
      model: "qwen-test",
      baseUrl: "http://127.0.0.1:9000",
      apiPath: "/v1/chat/completions"
    });

    expect(resolved).toEqual({
      provider: "local",
      model: "qwen-test",
      baseUrl: "http://127.0.0.1:9000",
      apiPath: "/v1/chat/completions",
      timeoutMs: 15000
    });
  });

  it("sends merged prompts to the local provider endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ answer: "{\"status\":\"ok\"}" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createLlmClient({
      provider: "local",
      baseUrl: "http://127.0.0.1:8000",
      apiPath: "/api/chat/raw",
      model: "Qwen/Qwen3-4B"
    });

    const text = await client.generateText({
      system: "Return JSON only.",
      user: "Say hello.",
      maxTokens: 128
    });

    expect(text).toBe("{\"status\":\"ok\"}");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/chat/raw", "http://127.0.0.1:8000"),
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" }
      })
    );

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
    expect(body["history"]).toEqual([]);
    expect(body["model"]).toBe("Qwen/Qwen3-4B");
    expect(String(body["message"])).toContain("System:\nReturn JSON only.");
    expect(String(body["message"])).toContain("User:\nSay hello.");
  });

  it("builds specialized scan payloads for the repo-local service", () => {
    expect(
      buildLocalRequestBody("/generate", "Qwen/Qwen3-1.7B", {
        system: "sys",
        user: "usr",
        maxTokens: 99
      })
    ).toEqual({
      model: "Qwen/Qwen3-1.7B",
      system: "sys",
      user: "usr",
      maxTokens: 99,
      workflow: "synosec-scan"
    });
  });
});
