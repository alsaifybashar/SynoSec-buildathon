import {
  apiRoutes,
  type AiAgent,
  type AiProvider,
  type AiTool,
  type CreateAiAgentBody,
  type ListAiProvidersResponse,
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
  const [providersPayload, toolsPayload] = await Promise.all([
    fetchJson<ListAiProvidersResponse>(`${apiRoutes.aiProviders}?page=1&pageSize=100&sortBy=name&sortDirection=asc`),
    fetchJson<ListAiToolsResponse>(`${apiRoutes.aiTools}?page=1&pageSize=100&sortBy=name&sortDirection=asc`)
  ]);

  const providers = Array.isArray(providersPayload["providers"]) ? providersPayload["providers"] as AiProvider[] : [];
  const tools = Array.isArray(toolsPayload["tools"]) ? toolsPayload["tools"] as AiTool[] : [];
  const providerLookup = Object.fromEntries(providers.map((provider) => [provider.id, provider.name]));

  return {
    providers,
    tools,
    providerLookup,
    defaultProviderId: providers[0]?.id ?? ""
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
    status: undefined,
    providerId: undefined
  },
  loadContext: loadAiAgentContext,
  createEmptyFormValues: (context) => createEmptyFormValues(context?.defaultProviderId ?? ""),
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
  applyContextDefaults: ({ formValues, initialValues, context }) => {
    if (formValues.providerId || !context.defaultProviderId) {
      return { formValues, initialValues };
    }

    const nextFormValues = {
      ...formValues,
      providerId: context.defaultProviderId
    };

    return {
      formValues: nextFormValues,
      initialValues: {
        ...initialValues,
        providerId: context.defaultProviderId
      }
    };
  }
});
