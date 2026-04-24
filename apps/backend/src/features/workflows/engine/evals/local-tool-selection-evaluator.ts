import { z } from "zod";

const ollamaTagsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string()
    })
  )
});

export const toolSelectionResponseSchema = z.object({
  selectedToolIds: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1)
});

export type ToolSelectionResponse = z.infer<typeof toolSelectionResponseSchema>;

export type ToolDefinitionForEvaluation = {
  id: string;
  name: string;
  description: string;
  category: string;
  riskTier: string;
};

export type ToolSelectionEvaluationInput = {
  roleName: string;
  systemPrompt: string;
  scenarioPrompt: string;
  availableTools: readonly ToolDefinitionForEvaluation[];
  requiredToolCount: number;
  extraInstructions?: string;
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

function isLocalModeDisabled() {
  return (process.env["LOCAL_ENABLED"] ?? process.env["LOCAL_ENABHLED"] ?? "TRUE").toLowerCase() === "false";
}

export class LocalToolSelectionEvaluator {
  constructor(
    private readonly options: {
      baseUrl?: string;
      apiPath?: string;
      model?: string;
      timeoutMs?: number;
    } = {}
  ) {}

  get model() {
    return this.options.model ?? process.env["LLM_LOCAL_MODEL"] ?? "qwen3:1.7b";
  }

  get baseUrl() {
    return this.options.baseUrl ?? process.env["LLM_LOCAL_BASE_URL"] ?? "http://127.0.0.1:11434";
  }

  get apiPath() {
    return this.options.apiPath ?? "/api/chat";
  }

  async assertReady() {
    if (isLocalModeDisabled()) {
      throw new Error("LOCAL_ENABLED is false. Live Qwen evaluation requires the local model stack.");
    }

    const response = await this.fetchJson("/api/tags", {
      method: "GET"
    });
    const parsed = ollamaTagsResponseSchema.parse(response);
    const models = parsed.models.map((model) => model.name);

    if (!models.includes(this.model)) {
      throw new Error(`Local model ${this.model} is not installed in Ollama.`);
    }
  }

  async evaluate(input: ToolSelectionEvaluationInput) {
    const response = await this.fetchJson(this.apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        options: {
          temperature: 0
        },
        messages: [
          {
            role: "system",
            content: `${input.systemPrompt}\nReturn strict JSON only.`
          },
          {
            role: "user",
            content: [
              `Role: ${input.roleName}`,
              `Choose exactly ${input.requiredToolCount} tool ids in order.`,
              "Available tools:",
              ...input.availableTools.map(
                (tool) => `- ${tool.id}: ${tool.description} [category=${tool.category}; risk=${tool.riskTier}]`
              ),
              input.scenarioPrompt,
              input.extraInstructions ?? "",
              `Respond with JSON {"selectedToolIds":[${new Array(input.requiredToolCount).fill("string").join(",")}],"reason":"string"}.`
            ]
              .filter(Boolean)
              .join("\n")
          }
        ]
      })
    });

    const rawContent = z
      .object({
        message: z.object({
          content: z.string()
        })
      })
      .parse(response).message.content;

    const parsed = parseToolSelectionResponse(rawContent);

    if (parsed.selectedToolIds.length !== input.requiredToolCount) {
      throw new Error(
        `Expected ${input.requiredToolCount} tool ids from local model, received ${parsed.selectedToolIds.length}: ${rawContent}`
      );
    }

    return {
      rawContent,
      parsed
    };
  }

  private async fetchJson(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);

    try {
      const response = await fetch(new URL(path, this.baseUrl), {
        ...init,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status} at ${path}.`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Unable to reach Ollama at ${this.baseUrl}: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function parseToolSelectionResponse(rawContent: string) {
  const trimmed = rawContent.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error(`Model response did not contain JSON: ${rawContent}`);
  }

  const candidate = trimmed.slice(jsonStart, jsonEnd + 1);
  return toolSelectionResponseSchema.parse(JSON.parse(candidate));
}
