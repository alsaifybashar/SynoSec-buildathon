import { randomUUID } from "node:crypto";
import type {
  AiTool,
  AiToolsListQuery,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapAiToolRow } from "@/modules/ai-tools/ai-tools.mapper.js";
import { type AiToolsRepository } from "@/modules/ai-tools/ai-tools.repository.js";
import { enrichAiTool } from "./ai-tool-surface.js";
import { mergeAndPaginateAiTools, rejectBuiltinAiToolMutation, getBuiltinAiTool, isBuiltinAiToolId } from "./builtin-ai-tools.js";
import { encodeCreateToolInput, encodeUpdateToolInput } from "./tool-execution-config.js";

export class PrismaAiToolsRepository implements AiToolsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: AiToolsListQuery): Promise<PaginatedResult<AiTool>> {
    const where = {
      NOT: [
        { id: { startsWith: "builtin-" } },
        { id: { startsWith: "native-" } }
      ],
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.accessProfile ? { accessProfile: query.accessProfile } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [items] = await Promise.all([
      this.prisma.aiTool.findMany({
        where,
        orderBy: { name: "asc" }
      })
    ]);

    return mergeAndPaginateAiTools(items.map(mapAiToolRow), query);
  }

  async getById(id: string): Promise<AiTool | null> {
    const builtin = getBuiltinAiTool(id);
    if (builtin) {
      return enrichAiTool(builtin);
    }

    if (id.startsWith("native-")) {
      return null;
    }

    const tool = await this.prisma.aiTool.findUnique({ where: { id } });
    return tool ? enrichAiTool(mapAiToolRow(tool)) : null;
  }

  async create(input: CreateAiToolBody): Promise<AiTool> {
    const encoded = encodeCreateToolInput(input);
    const tool = await this.prisma.aiTool.create({
      data: {
        id: randomUUID(),
        name: encoded.name,
        status: encoded.status,
        source: "custom",
        accessProfile: encoded.accessProfile,
        description: encoded.description,
        adapter: null,
        binary: null,
        category: encoded.category,
        riskTier: encoded.riskTier,
        notes: null,
        inputSchema: encoded.inputSchema as Prisma.InputJsonValue,
        outputSchema: encoded.outputSchema as Prisma.InputJsonValue
      }
    });

    return mapAiToolRow(tool);
  }

  async update(id: string, input: UpdateAiToolBody): Promise<AiTool | null> {
    if (isBuiltinAiToolId(id)) {
      rejectBuiltinAiToolMutation(id);
    }

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
        source: "custom",
        accessProfile: encoded.accessProfile ?? current.accessProfile,
        description: encoded.description === undefined ? current.description : encoded.description,
        adapter: current.adapter,
        binary: current.binary,
        category: encoded.category ?? current.category,
        riskTier: encoded.riskTier ?? current.riskTier,
        notes: current.notes,
        inputSchema: (encoded.inputSchema ?? current.inputSchema) as Prisma.InputJsonValue,
        outputSchema: (encoded.outputSchema ?? current.outputSchema) as Prisma.InputJsonValue
      }
    });

    return mapAiToolRow(tool);
  }

  async remove(id: string): Promise<boolean> {
    if (isBuiltinAiToolId(id)) {
      rejectBuiltinAiToolMutation(id);
    }

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
