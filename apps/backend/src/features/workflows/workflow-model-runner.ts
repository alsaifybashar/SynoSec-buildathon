import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type LanguageModel } from "ai";
import { RequestError } from "@/shared/http/request-error.js";
import type { StoredAiProvider } from "@/features/ai-providers/index.js";

type LocalWorkflowModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class WorkflowModelRunner {
  assertProviderSupportsWorkflowExecution(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Workflow stage provider not found.");
    }

    if (provider.kind === "anthropic" && !provider.apiKey) {
      throw new RequestError(400, "Workflow runs require an Anthropic API key when the selected agent uses an Anthropic provider.");
    }

    if (provider.kind === "local" && !provider.baseUrl) {
      throw new RequestError(400, "Workflow runs require a base URL when the selected agent uses a local provider.");
    }
  }

  async callWorkflowModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalWorkflowModelMessage[]
  ) {
    if (provider.kind === "local") {
      return this.callLocalWorkflowModel(provider, model, messages);
    }

    return this.callHostedWorkflowModel(provider, model, messages);
  }

  parseJsonObjectFromModel(rawContent: string) {
    const trimmed = rawContent.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error("Model response did not contain a JSON object.");
    }

    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Model response was not a JSON object.");
    }

    return parsed as Record<string, unknown>;
  }

  private createAnthropicLanguageModel(provider: StoredAiProvider, model: string): LanguageModel {
    const anthropic = createAnthropic({
      ...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {})
    });

    return anthropic(model);
  }

  private async callHostedWorkflowModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalWorkflowModelMessage[]
  ) {
    const languageModel = this.createAnthropicLanguageModel(provider, model);
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const prompt = messages
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
      .join("\n\n");

    const result = await generateText({
      model: languageModel,
      system,
      prompt
    });

    const content = result.text.trim();
    if (!content) {
      throw new Error("Hosted provider returned an empty workflow response.");
    }

    return content;
  }

  private async callLocalWorkflowModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalWorkflowModelMessage[]
  ) {
    const baseUrl = provider.baseUrl;
    if (!baseUrl) {
      throw new Error("Local workflow execution requires a provider base URL.");
    }

    const response = await fetch(new URL("/api/chat", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: {
          temperature: 0
        },
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`Local provider request failed with status ${response.status}.`);
    }

    const payload = await response.json() as { message?: { content?: string } };
    const content = payload.message?.content?.trim();
    if (!content) {
      throw new Error("Local provider returned an empty workflow response.");
    }

    return content;
  }
}
