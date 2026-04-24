import { randomUUID } from "node:crypto";
import type {
  AiAgent,
  AiAgentsListQuery,
  CreateAiAgentBody,
  UpdateAiAgentBody
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import type { AiProvidersRepository } from "@/features/ai-providers/index.js";
import type { AiToolsRepository } from "@/features/ai-tools/index.js";
import { type AiAgentsRepository } from "@/features/ai-agents/ai-agents.repository.js";

export class MemoryAiAgentsRepository implements AiAgentsRepository {
  private readonly records = new Map<string, AiAgent>();

  constructor(
    private readonly providersRepository: AiProvidersRepository,
    private readonly toolsRepository: AiToolsRepository,
    seed: AiAgent[] = []
  ) {
    seed.forEach((agent) => {
      this.records.set(agent.id, agent);
    });
  }

  async list(query: AiAgentsListQuery): Promise<PaginatedResult<AiAgent>> {
    const normalizedQuery = query.q?.trim().toLowerCase();
    const sorted = [...this.records.values()]
      .filter((agent) => !query.status || agent.status === query.status)
      .filter((agent) => !query.providerId || agent.providerId === query.providerId)
      .filter((agent) => {
        if (!normalizedQuery) {
          return true;
        }

        return [agent.name, agent.description ?? "", agent.systemPrompt]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const sortBy = query.sortBy ?? "name";
        const direction = query.sortDirection === "desc" ? -1 : 1;
        const leftValue = sortBy === "toolIds" ? left.toolIds.length : left[sortBy];
        const rightValue = sortBy === "toolIds" ? right.toolIds.length : right[sortBy];

        if (leftValue === rightValue) {
          return left.name.localeCompare(right.name) * direction;
        }

        return (leftValue > rightValue ? 1 : -1) * direction;
      });

    return paginateItems(sorted, query.page, query.pageSize);
  }

  async getById(id: string): Promise<AiAgent | null> {
    return this.records.get(id) ?? null;
  }

  async create(input: CreateAiAgentBody): Promise<AiAgent> {
    await this.assertReferences(input.providerId, input.toolIds);

    const timestamp = new Date().toISOString();
    const record: AiAgent = {
      id: randomUUID(),
      name: input.name,
      status: input.status,
      description: input.description,
      providerId: input.providerId,
      systemPrompt: input.systemPrompt,
      modelOverride: input.modelOverride,
      toolIds: input.toolIds,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, input: UpdateAiAgentBody): Promise<AiAgent | null> {
    const current = this.records.get(id);
    if (!current) {
      return null;
    }

    await this.assertReferences(input.providerId ?? current.providerId, input.toolIds ?? current.toolIds);

    const updated: AiAgent = {
      ...current,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      description: input.description === undefined ? current.description : input.description,
      providerId: input.providerId ?? current.providerId,
      systemPrompt: input.systemPrompt ?? current.systemPrompt,
      modelOverride: input.modelOverride === undefined ? current.modelOverride : input.modelOverride,
      toolIds: input.toolIds ?? current.toolIds,
      updatedAt: new Date().toISOString()
    };

    this.records.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  private async assertReferences(providerId: string, toolIds: string[]) {
    const provider = await this.providersRepository.getById(providerId);
    if (!provider) {
      throw new RequestError(400, "AI provider not found.");
    }

    for (const toolId of toolIds) {
      const tool = await this.toolsRepository.getById(toolId);
      if (!tool) {
        throw new RequestError(400, `AI tool not found: ${toolId}`);
      }
    }
  }
}
