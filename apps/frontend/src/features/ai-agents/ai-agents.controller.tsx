import {
  fixedAiRuntimeLabel,
  type AiAgent,
  type AiTool,
  type CreateAiAgentBody,
  type ListAiToolsResponse
} from "@synosec/contracts";
import {
  aiAgentsDefinition,
  createEmptyFormValues,
  toFormValues,
  toRequestBody,
  validateForm,
  type AgentFormValues,
  type AiAgentDefinitionContext
} from "@/features/ai-agents/definition";
import { aiAgentsPort } from "@/features/ai-agents/ai-agents.port";
import { aiAgentTransfer } from "@/features/ai-agents/transfer";
import { createCrudFeatureController } from "@/shared/crud-controller/create-crud-feature-controller";
import { fetchJson } from "@/shared/lib/api";
import type { AiAgentsQuery } from "@/shared/lib/resource-client";

async function loadAiAgentContext(): Promise<AiAgentDefinitionContext> {
  const toolsPayload = await fetchJson<ListAiToolsResponse>("/api/ai-tools?page=1&pageSize=100&sortBy=name&sortDirection=asc");
  const tools = Array.isArray(toolsPayload["tools"]) ? toolsPayload["tools"] as AiTool[] : [];

  return {
    tools,
    runtimeLabel: fixedAiRuntimeLabel
  };
}

export const aiAgentsController = createCrudFeatureController<
  AiAgent,
  AgentFormValues,
  AiAgentsQuery,
  AiAgentDefinitionContext,
  CreateAiAgentBody
>({
  recordLabel: aiAgentsDefinition.recordLabel,
  ...(aiAgentsDefinition.titleLabel ? { titleLabel: aiAgentsDefinition.titleLabel } : {}),
  port: aiAgentsPort,
  transfer: aiAgentTransfer,
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined
  },
  loadContext: loadAiAgentContext,
  createEmptyFormValues: () => createEmptyFormValues(),
  toFormValues,
  parseRequestBody: ({ formValues }) => {
    const errors = validateForm(formValues);
    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    return {
      body: toRequestBody(formValues),
      errors: {}
    };
  },
  getItemLabel: (agent) => agent.name,
  applyContextDefaults: ({ formValues, initialValues }) => ({ formValues, initialValues })
});
