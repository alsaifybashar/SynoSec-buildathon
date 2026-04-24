import { randomUUID } from "node:crypto";
import type {
  AiProvider,
  AiProvidersListQuery,
  CreateAiProviderBody,
  UpdateAiProviderBody
} from "@synosec/contracts";
import { PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapAiProviderRow } from "../ai-providers/ai-providers.mapper.js";
import { type AiProvidersRepository, type StoredAiProvider } from "../ai-providers/ai-providers.repository.js";

export class PrismaAiProvidersRepository implements AiProvidersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: AiProvidersListQuery): Promise<PaginatedResult<AiProvider>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { model: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = query.sortBy === "apiKey"
      ? { apiKey: query.sortDirection }
      : { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.aiProvider.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.aiProvider.count({ where })
    ]);

    return {
      items: items.map(mapAiProviderRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<AiProvider | null> {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    return provider ? mapAiProviderRow(provider) : null;
  }

  async getStoredById(id: string): Promise<StoredAiProvider | null> {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      return null;
    }

    return {
      ...mapAiProviderRow(provider),
      apiKey: provider.apiKey
    };
  }

  async create(input: CreateAiProviderBody): Promise<AiProvider> {
    const provider = await this.prisma.aiProvider.create({
      data: {
        id: randomUUID(),
        name: input.name,
        kind: input.kind,
        status: input.status,
        description: input.description,
        baseUrl: input.baseUrl,
        model: input.model,
        apiKey: input.apiKey ?? null
      }
    });

    return mapAiProviderRow(provider);
  }

  async update(id: string, input: UpdateAiProviderBody): Promise<AiProvider | null> {
    const current = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!current) {
      return null;
    }

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        kind: input.kind ?? current.kind,
        status: input.status ?? current.status,
        description: input.description === undefined ? current.description : input.description,
        baseUrl: input.baseUrl === undefined ? current.baseUrl : input.baseUrl,
        model: input.model ?? current.model,
        apiKey: input.apiKey === undefined ? current.apiKey : input.apiKey
      }
    });

    return mapAiProviderRow(provider);
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.aiProvider.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
