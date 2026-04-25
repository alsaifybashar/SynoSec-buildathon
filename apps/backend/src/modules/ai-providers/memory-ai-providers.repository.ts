import { randomUUID } from "node:crypto";
import type {
  AiProvider,
  AiProvidersListQuery,
  CreateAiProviderBody,
  UpdateAiProviderBody
} from "@synosec/contracts";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { type AiProvidersRepository, type StoredAiProvider } from "@/modules/ai-providers/ai-providers.repository.js";

export class MemoryAiProvidersRepository implements AiProvidersRepository {
  private readonly records = new Map<string, StoredAiProvider>();

  constructor(seed: StoredAiProvider[] = []) {
    seed.forEach((provider) => {
      this.records.set(provider.id, provider);
    });
  }

  async list(query: AiProvidersListQuery): Promise<PaginatedResult<AiProvider>> {
    const normalizedQuery = query.q?.trim().toLowerCase();
    const sorted = [...this.records.values()]
      .filter((provider) => !query.status || provider.status === query.status)
      .filter((provider) => !query.kind || provider.kind === query.kind)
      .filter((provider) => {
        if (!normalizedQuery) {
          return true;
        }

        return [provider.name, provider.model, provider.description ?? ""]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const sortBy = query.sortBy ?? "name";
        const direction = query.sortDirection === "desc" ? -1 : 1;
        const leftValue = normalizeSortableValue(sortBy === "apiKey" ? left.apiKey : left[sortBy]);
        const rightValue = normalizeSortableValue(sortBy === "apiKey" ? right.apiKey : right[sortBy]);

        if (leftValue === rightValue) {
          return left.name.localeCompare(right.name) * direction;
        }

        return (leftValue > rightValue ? 1 : -1) * direction;
      })
      .map(({ apiKey: _apiKey, ...provider }) => provider);

    return paginateItems(sorted, query.page, query.pageSize);
  }

  async getById(id: string): Promise<AiProvider | null> {
    const provider = this.records.get(id);
    if (!provider) {
      return null;
    }

    const { apiKey: _apiKey, ...record } = provider;
    return record;
  }

  async getStoredById(id: string): Promise<StoredAiProvider | null> {
    return this.records.get(id) ?? null;
  }

  async create(input: CreateAiProviderBody): Promise<AiProvider> {
    const timestamp = new Date().toISOString();
    const record: StoredAiProvider = {
      id: randomUUID(),
      name: input.name,
      kind: input.kind,
      status: input.status,
      description: input.description,
      baseUrl: input.baseUrl,
      model: input.model,
      apiKeyConfigured: Boolean(input.apiKey),
      apiKey: input.apiKey ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.records.set(record.id, record);
    const { apiKey: _apiKey, ...result } = record;
    return result;
  }

  async update(id: string, input: UpdateAiProviderBody): Promise<AiProvider | null> {
    const current = this.records.get(id);
    if (!current) {
      return null;
    }

    const updated: StoredAiProvider = {
      ...current,
      name: input.name ?? current.name,
      kind: input.kind ?? current.kind,
      status: input.status ?? current.status,
      description: input.description === undefined ? current.description : input.description,
      baseUrl: input.baseUrl === undefined ? current.baseUrl : input.baseUrl,
      model: input.model ?? current.model,
      apiKey: input.apiKey === undefined ? current.apiKey : input.apiKey,
      apiKeyConfigured: input.apiKey === undefined ? current.apiKeyConfigured : Boolean(input.apiKey),
      updatedAt: new Date().toISOString()
    };

    this.records.set(id, updated);
    const { apiKey: _apiKey, ...result } = updated;
    return result;
  }

  async remove(id: string): Promise<boolean> {
    return this.records.delete(id);
  }
}

function normalizeSortableValue(value: string | null): string;
function normalizeSortableValue(value: string | boolean): string | number;
function normalizeSortableValue(value: string | boolean | null): string | number {
  if (value === null) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return value;
}
