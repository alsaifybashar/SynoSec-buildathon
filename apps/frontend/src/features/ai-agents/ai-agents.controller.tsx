import {
  apiRoutes,
  healthResponseSchema,
  type AiAgent,
  type AiTool,
  type CreateAiAgentBody,
  type HealthResponse,
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
  const [toolsPayload, healthPayload] = await Promise.all([
    fetchJson<ListAiToolsResponse>("/api/ai-tools?page=1&pageSize=100&sortBy=name&sortDirection=asc"),
    fetchJson<HealthResponse>(apiRoutes.health)
  ]);
  const tools = Array.isArray(toolsPayload["tools"]) ? toolsPayload["tools"] as AiTool[] : [];
  const health = healthResponseSchema.parse(healthPayload);

  return {
    tools,
    runtimeLabel: health.runtime.label
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
