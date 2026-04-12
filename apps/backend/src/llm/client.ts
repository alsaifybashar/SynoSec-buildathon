import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";
import type { LlmProvider, ScanLlmConfig } from "@synosec/contracts";

export interface GenerateTextParams {
  system: string;
  user: string;
  maxTokens: number;
}

export interface LlmClient {
  readonly provider: LlmProvider;
  readonly model: string;
  generateText(params: GenerateTextParams): Promise<string>;
}

interface ResolvedLlmConfig {
  provider: LlmProvider;
  model: string;
  baseUrl?: string;
  apiPath?: string;
  timeoutMs?: number;
}

function resolveLlmConfig(config?: ScanLlmConfig): ResolvedLlmConfig {
  const provider = config?.provider ?? (process.env["LLM_PROVIDER"] as LlmProvider | undefined) ?? "anthropic";

  if (provider === "local") {
    return {
      provider,
      model: config?.model ?? process.env["LLM_LOCAL_MODEL"] ?? "local-qwen",
      baseUrl: config?.baseUrl ?? process.env["LLM_LOCAL_BASE_URL"] ?? "http://127.0.0.1:8010",
      apiPath: config?.apiPath ?? process.env["LLM_LOCAL_API_PATH"] ?? "/generate",
      timeoutMs: Number(process.env["LLM_LOCAL_TIMEOUT_MS"] ?? "15000")
    };
  }

  return {
    provider,
    model: config?.model ?? process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-6"
  };
}

class AnthropicLlmClient implements LlmClient {
  readonly provider = "anthropic" as const;
  private client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

  constructor(readonly model: string) {}

  async generateText(params: GenerateTextParams): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.user }]
    } satisfies MessageCreateParams);

    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }
}

class LocalHttpLlmClient implements LlmClient {
  readonly provider = "local" as const;

  constructor(
    readonly model: string,
    private readonly baseUrl: string,
    private readonly apiPath: string,
    private readonly timeoutMs: number
  ) {}

  async generateText(params: GenerateTextParams): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(new URL(this.apiPath, this.baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildLocalRequestBody(this.apiPath, this.model, params)),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Local LLM request failed with ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return extractLocalText(payload);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Local LLM request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildLocalRequestBody(apiPath: string, model: string, params: GenerateTextParams): Record<string, unknown> {
  if (apiPath === "/api/chat/raw") {
    return {
      message: [
        `System:\n${params.system}`,
        `User:\n${params.user}`,
        "Return only the requested answer."
      ].join("\n\n"),
      history: [],
      model
    };
  }

  return {
    model,
    system: params.system,
    user: params.user,
    maxTokens: params.maxTokens,
    workflow: "synosec-scan"
  };
}

function extractLocalText(payload: Record<string, unknown>): string {
  const answer = payload["answer"];
  if (typeof answer === "string") {
    return answer;
  }

  const content = payload["content"];
  if (typeof content === "string") {
    return content;
  }

  const text = payload["text"];
  if (typeof text === "string") {
    return text;
  }

  const choices = payload["choices"];
  if (Array.isArray(choices)) {
    const firstChoice = choices[0];
    if (firstChoice && typeof firstChoice === "object") {
      const firstMessage = (firstChoice as Record<string, unknown>)["message"];
      if (firstMessage && typeof firstMessage === "object") {
        const messageContent = (firstMessage as Record<string, unknown>)["content"];
        if (typeof messageContent === "string") {
          return messageContent;
        }
      }
      const choiceText = (firstChoice as Record<string, unknown>)["text"];
      if (typeof choiceText === "string") {
        return choiceText;
      }
    }
  }

  throw new Error("Local LLM response did not contain answer text");
}

export function createLlmClient(config?: ScanLlmConfig): LlmClient {
  const resolved = resolveLlmConfig(config);

  if (resolved.provider === "local") {
    return new LocalHttpLlmClient(
      resolved.model,
      resolved.baseUrl ?? "http://127.0.0.1:8010",
      resolved.apiPath ?? "/generate",
      resolved.timeoutMs ?? 15000
    );
  }

  return new AnthropicLlmClient(resolved.model);
}

export { buildLocalRequestBody, extractLocalText, resolveLlmConfig };
