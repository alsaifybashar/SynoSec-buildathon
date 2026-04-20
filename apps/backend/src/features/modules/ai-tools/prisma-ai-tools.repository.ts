import { randomUUID } from "node:crypto";
import type {
  AiTool,
  AiToolsListQuery,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";
import { Prisma, PrismaClient } from "../../../platform/generated/prisma/index.js";
import type { PaginatedResult } from "../../../platform/core/pagination/paginated-result.js";
import { mapAiToolRow } from "../ai-tools/ai-tools.mapper.js";
import { type AiToolsRepository } from "../ai-tools/ai-tools.repository.js";

export class PrismaAiToolsRepository implements AiToolsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: AiToolsListQuery): Promise<PaginatedResult<AiTool>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } },
              { notes: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const matching = await this.prisma.aiTool.findMany({ where, orderBy });
    const items = matching.slice(skip, skip + query.pageSize);
    const total = matching.length;

    return {
      items: items.map(mapAiToolRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<AiTool | null> {
    const tool = await this.prisma.aiTool.findUnique({ where: { id } });
    return tool ? mapAiToolRow(tool) : null;
  }

  async create(input: CreateAiToolBody): Promise<AiTool> {
    const tool = await this.prisma.aiTool.create({
      data: {
        id: randomUUID(),
        name: input.name,
        status: input.status,
        source: "custom",
        description: input.description,
        adapter: input.adapter ?? null,
        binary: input.binary ?? null,
        category: input.category,
        riskTier: input.riskTier,
        notes: input.notes,
        inputSchema: input.inputSchema as Prisma.InputJsonValue,
        outputSchema: input.outputSchema as Prisma.InputJsonValue
      }
    });

    return mapAiToolRow(tool);
  }

  async update(id: string, input: UpdateAiToolBody): Promise<AiTool | null> {
    const current = await this.prisma.aiTool.findUnique({ where: { id } });
    if (!current) {
      return null;
    }

    const tool = await this.prisma.aiTool.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        status: input.status ?? current.status,
        description: input.description === undefined ? current.description : input.description,
        adapter: input.adapter ?? current.adapter,
        binary: input.binary === undefined ? current.binary : input.binary ?? null,
        category: input.category ?? current.category,
        riskTier: input.riskTier ?? current.riskTier,
        notes: input.notes === undefined ? current.notes : input.notes,
        inputSchema: (input.inputSchema ?? current.inputSchema) as Prisma.InputJsonValue,
        outputSchema: (input.outputSchema ?? current.outputSchema) as Prisma.InputJsonValue
      }
    });

    return mapAiToolRow(tool);
  }

  async remove(id: string): Promise<boolean> {
    const current = await this.prisma.aiTool.findUnique({ where: { id } });
    if (!current) {
      return false;
    }

    try {
      await this.prisma.aiTool.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
