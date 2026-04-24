import { randomUUID } from "node:crypto";
import type {
  AiTool,
  AiToolsListQuery,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapAiToolRow } from "../ai-tools/ai-tools.mapper.js";
import { type AiToolsRepository } from "../ai-tools/ai-tools.repository.js";
import { encodeCreateToolInput, encodeUpdateToolInput } from "./tool-execution-config.js";

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
    const [items, total] = await Promise.all([
      this.prisma.aiTool.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.aiTool.count({ where })
    ]);

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
    const encoded = encodeCreateToolInput(input);
    const tool = await this.prisma.aiTool.create({
      data: {
        id: randomUUID(),
        name: encoded.name,
        status: encoded.status,
        source: "custom",
        description: encoded.description,
        adapter: null,
        binary: encoded.binary ?? null,
        category: encoded.category,
        riskTier: encoded.riskTier,
        notes: encoded.notes,
        inputSchema: encoded.inputSchema as Prisma.InputJsonValue,
        outputSchema: encoded.outputSchema as Prisma.InputJsonValue
      }
    });

    return mapAiToolRow(tool);
  }

  async update(id: string, input: UpdateAiToolBody): Promise<AiTool | null> {
    const current = await this.prisma.aiTool.findUnique({ where: { id } });
    if (!current) {
      return null;
    }

    const encoded = encodeUpdateToolInput(input, mapAiToolRow(current as never));
    const tool = await this.prisma.aiTool.update({
      where: { id },
      data: {
        name: encoded.name ?? current.name,
        status: encoded.status ?? current.status,
        description: encoded.description === undefined ? current.description : encoded.description,
        adapter: current.adapter,
        binary: encoded.binary === undefined ? current.binary : encoded.binary ?? null,
        category: encoded.category ?? current.category,
        riskTier: encoded.riskTier ?? current.riskTier,
        notes: encoded.notes === undefined ? current.notes : encoded.notes,
        inputSchema: (encoded.inputSchema ?? current.inputSchema) as Prisma.InputJsonValue,
        outputSchema: (encoded.outputSchema ?? current.outputSchema) as Prisma.InputJsonValue
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
