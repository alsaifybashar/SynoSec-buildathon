import {
  apiRoutes,
  aiAgentSchema,
  aiProviderSchema,
  aiToolSchema,
  applicationSchema,
  createAiAgentBodySchema,
  createAiProviderBodySchema,
  createAiToolBodySchema,
  createApplicationBodySchema,
  createRuntimeBodySchema,
  createWorkflowBodySchema,
  runtimeSchema,
  workflowSchema,
  type AiAgent,
  type AiProvider,
  type AiTool,
  type Application,
  type CreateAiAgentBody,
  type CreateAiProviderBody,
  type CreateAiToolBody,
  type CreateApplicationBody,
  type CreateRuntimeBody,
  type CreateWorkflowBody,
  type Runtime,
  type Workflow
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";

type ParseIssue = {
  path: Array<string | number>;
  message: string;
};

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: ParseIssue[] } };

type SchemaLike<T> = {
  parse: (input: unknown) => T;
  safeParse: (input: unknown) => SafeParseResult<T>;
};

type ResourceTransferConfig<TItem, TCreateBody> = {
  table: string;
  route: string;
  itemSchema: SchemaLike<TItem>;
  createBodySchema: SchemaLike<TCreateBody>;
  toCreateBody: (item: TItem) => TCreateBody;
};

type ResourceImportEnvelope = {
  version: 1;
  table: string;
  exportedAt: string;
  records: unknown[];
};

function formatSchemaIssues(issues: ParseIssue[]) {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join(" ");
}

function sanitizeFileBaseName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || "export";
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function readFileText(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error(`Failed to read "${file.name}".`));
    };
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  });
}

function parseImportEnvelope(input: unknown): ResourceImportEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Import JSON must be an object.");
  }

  const record = input as Record<string, unknown>;
  if (record["version"] !== 1) {
    throw new Error("Import JSON version must be 1.");
  }
  if (typeof record["table"] !== "string" || !record["table"].trim()) {
    throw new Error('Import JSON must include a non-empty "table" value.');
  }
  if (typeof record["exportedAt"] !== "string" || Number.isNaN(Date.parse(record["exportedAt"]))) {
    throw new Error('Import JSON must include a valid "exportedAt" timestamp.');
  }
  if (!Array.isArray(record["records"]) || record["records"].length === 0) {
    throw new Error("Import JSON must contain at least one record.");
  }

  return {
    version: 1,
    table: record["table"],
    exportedAt: record["exportedAt"],
    records: record["records"]
  };
}

async function parseImportFile<TItem>(config: ResourceTransferConfig<TItem, unknown>, file: File) {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(await readFileText(file));
  } catch {
    throw new Error(`"${file.name}" is not valid JSON.`);
  }

  const envelope = parseImportEnvelope(parsedJson);

  if (envelope.table !== config.table) {
    throw new Error(`Import file targets table "${envelope.table}", but this view expects "${config.table}".`);
  }

  const records: TItem[] = [];
  for (let index = 0; index < envelope.records.length; index += 1) {
    const result = config.itemSchema.safeParse(envelope.records[index]);
    if (!result.success) {
      throw new Error(`Record ${index + 1} is invalid: ${formatSchemaIssues(result.error.issues)}`);
    }
    records.push(result.data);
  }

  return records;
}

export function exportResourceRecords<TItem>(
  config: ResourceTransferConfig<TItem, unknown>,
  records: TItem[],
  fileBaseName: string
) {
  const payload = {
    version: 1 as const,
    table: config.table,
    exportedAt: new Date().toISOString(),
    records: records.map((record) => config.itemSchema.parse(record))
  };

  downloadJson(`${sanitizeFileBaseName(fileBaseName)}.json`, payload);
}

export async function importResourceRecords<TItem, TCreateBody>(
  config: ResourceTransferConfig<TItem, TCreateBody>,
  file: File
) {
  const importedRecords = await parseImportFile(config, file);
  const createBodies = importedRecords.map((record, index) => {
    const result = config.createBodySchema.safeParse(config.toCreateBody(record));
    if (!result.success) {
      throw new Error(`Record ${index + 1} is not importable: ${formatSchemaIssues(result.error.issues)}`);
    }

    return result.data;
  });

  const created: TItem[] = [];
  for (let index = 0; index < createBodies.length; index += 1) {
    try {
      created.push(await fetchJson<TItem>(config.route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBodies[index])
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (created.length > 0) {
        throw new Error(`Import failed after ${created.length} of ${createBodies.length} records were created. ${message}`);
      }

      throw new Error(message);
    }
  }

  return created;
}

export const applicationTransfer = {
  table: "applications",
  route: apiRoutes.applications,
  itemSchema: applicationSchema,
  createBodySchema: createApplicationBodySchema,
  toCreateBody: (application: Application): CreateApplicationBody => ({
    name: application.name,
    baseUrl: application.baseUrl,
    environment: application.environment,
    status: application.status,
    lastScannedAt: application.lastScannedAt
  })
} satisfies ResourceTransferConfig<Application, CreateApplicationBody>;

export const runtimeTransfer = {
  table: "runtimes",
  route: apiRoutes.runtimes,
  itemSchema: runtimeSchema,
  createBodySchema: createRuntimeBodySchema,
  toCreateBody: (runtime: Runtime): CreateRuntimeBody => ({
    name: runtime.name,
    serviceType: runtime.serviceType,
    provider: runtime.provider,
    environment: runtime.environment,
    region: runtime.region,
    status: runtime.status,
    applicationId: runtime.applicationId
  })
} satisfies ResourceTransferConfig<Runtime, CreateRuntimeBody>;

export const aiProviderTransfer = {
  table: "ai-providers",
  route: apiRoutes.aiProviders,
  itemSchema: aiProviderSchema,
  createBodySchema: createAiProviderBodySchema,
  toCreateBody: (provider: AiProvider): CreateAiProviderBody => ({
    name: provider.name,
    kind: provider.kind,
    status: provider.status,
    description: provider.description,
    baseUrl: provider.baseUrl,
    model: provider.model
  })
} satisfies ResourceTransferConfig<AiProvider, CreateAiProviderBody>;

export const aiAgentTransfer = {
  table: "ai-agents",
  route: apiRoutes.aiAgents,
  itemSchema: aiAgentSchema,
  createBodySchema: createAiAgentBodySchema,
  toCreateBody: (agent: AiAgent): CreateAiAgentBody => ({
    name: agent.name,
    status: agent.status,
    description: agent.description,
    providerId: agent.providerId,
    systemPrompt: agent.systemPrompt,
    modelOverride: agent.modelOverride,
    toolIds: agent.toolIds
  })
} satisfies ResourceTransferConfig<AiAgent, CreateAiAgentBody>;

export const aiToolTransfer = {
  table: "ai-tools",
  route: apiRoutes.aiTools,
  itemSchema: aiToolSchema,
  createBodySchema: createAiToolBodySchema,
  toCreateBody: (tool: AiTool): CreateAiToolBody => ({
    name: tool.name,
    status: tool.status,
    source: tool.source,
    description: tool.description ?? "",
    binary: tool.binary,
    executorType: tool.executorType,
    bashSource: tool.bashSource,
    capabilities: tool.capabilities,
    category: tool.category,
    riskTier: tool.riskTier,
    notes: tool.notes,
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    timeoutMs: tool.timeoutMs,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  })
} satisfies ResourceTransferConfig<AiTool, CreateAiToolBody>;

export const workflowTransfer = {
  table: "workflows",
  route: apiRoutes.workflows,
  itemSchema: workflowSchema,
  createBodySchema: createWorkflowBodySchema,
  toCreateBody: (workflow: Workflow): CreateWorkflowBody => ({
    name: workflow.name,
    status: workflow.status,
    description: workflow.description,
    applicationId: workflow.applicationId,
    runtimeId: workflow.runtimeId,
    agentId: workflow.agentId,
    objective: workflow.objective,
    allowedToolIds: workflow.allowedToolIds,
    requiredEvidenceTypes: workflow.requiredEvidenceTypes,
    findingPolicy: workflow.findingPolicy,
    completionRule: workflow.completionRule,
    resultSchemaVersion: workflow.resultSchemaVersion,
    handoffSchema: workflow.handoffSchema
  })
} satisfies ResourceTransferConfig<Workflow, CreateWorkflowBody>;
