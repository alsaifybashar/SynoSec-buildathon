import { randomUUID } from "node:crypto";
import type {
  AiTool,
  AiToolsListQuery,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { type AiToolsRepository } from "@/features/ai-tools/ai-tools.repository.js";
import { getBuiltinAiTool, isBuiltinAiToolId, mergeAndPaginateAiTools, rejectBuiltinAiToolMutation } from "./builtin-ai-tools.js";
import { encodeCreateToolInput, encodeUpdateToolInput, mapToolExecutionFields, stripExecutionConfig } from "./tool-execution-config.js";

export class MemoryAiToolsRepository implements AiToolsRepository {
  private readonly records = new Map<string, AiTool>();

  constructor(seed: AiTool[] = []) {
    seed.forEach((tool) => {
      this.records.set(tool.id, tool);
    });
  }

  async list(query: AiToolsListQuery): Promise<PaginatedResult<AiTool>> {
    const normalizedQuery = query.q?.trim().toLowerCase();
    const sorted = [...this.records.values()]
      .map((tool) => ({ ...tool, source: "custom" as const }))
      .filter((tool) => !query.category || tool.category === query.category)
      .filter((tool) => {
        if (!normalizedQuery) {
          return true;
        }

        return [tool.name, tool.description ?? "", tool.notes ?? ""]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const sortBy = query.sortBy ?? "name";
        const direction = query.sortDirection === "desc" ? -1 : 1;
        const leftValue = left[sortBy];
        const rightValue = right[sortBy];

        if (leftValue === rightValue) {
          return left.name.localeCompare(right.name) * direction;
        }

        return (leftValue > rightValue ? 1 : -1) * direction;
      });

    return mergeAndPaginateAiTools(sorted, query);
  }

  async getById(id: string): Promise<AiTool | null> {
    const builtin = getBuiltinAiTool(id);
    if (builtin) {
      return builtin;
    }

    const tool = this.records.get(id);
    return tool ? { ...tool, source: "custom" } : null;
  }

  async create(input: CreateAiToolBody): Promise<AiTool> {
    const timestamp = new Date().toISOString();
    const encoded = encodeCreateToolInput(input);
    const execution = mapToolExecutionFields(encoded.inputSchema);
    const record: AiTool = {
      id: randomUUID(),
      name: encoded.name,
      status: encoded.status,
      source: "custom",
      description: encoded.description,
      binary: encoded.binary ?? null,
      category: encoded.category,
      riskTier: encoded.riskTier,
      notes: encoded.notes,
      ...execution,
      inputSchema: stripExecutionConfig(encoded.inputSchema),
      outputSchema: encoded.outputSchema,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, input: UpdateAiToolBody): Promise<AiTool | null> {
    if (isBuiltinAiToolId(id)) {
      rejectBuiltinAiToolMutation(id);
    }

    const current = this.records.get(id);
    if (!current) {
      return null;
    }

    const encoded = encodeUpdateToolInput(input, current);
    const nextInputSchema = encoded.inputSchema ?? current.inputSchema;
    const execution = encoded.inputSchema
      ? mapToolExecutionFields(encoded.inputSchema)
      : {
          executorType: current.executorType,
          bashSource: current.bashSource,
          sandboxProfile: current.sandboxProfile,
          privilegeProfile: current.privilegeProfile,
          timeoutMs: current.timeoutMs,
          capabilities: current.capabilities
        };
    const updated: AiTool = {
      ...current,
      name: encoded.name ?? current.name,
      status: encoded.status ?? current.status,
      source: "custom",
      description: encoded.description === undefined ? current.description : encoded.description,
      binary: encoded.binary === undefined ? current.binary : encoded.binary ?? null,
      category: encoded.category ?? current.category,
      riskTier: encoded.riskTier ?? current.riskTier,
      notes: encoded.notes === undefined ? current.notes : encoded.notes,
      ...execution,
      inputSchema: stripExecutionConfig(nextInputSchema),
      outputSchema: encoded.outputSchema ?? current.outputSchema,
      updatedAt: new Date().toISOString()
    };

    this.records.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    if (isBuiltinAiToolId(id)) {
      rejectBuiltinAiToolMutation(id);
    }

    const current = this.records.get(id);
    if (!current) {
      return false;
    }

    return this.records.delete(id);
  }
}
