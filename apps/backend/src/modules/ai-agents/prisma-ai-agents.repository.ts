import { randomUUID } from "node:crypto";
import type {
  AiAgent,
  AiAgentsListQuery,
  CreateAiAgentBody,
  UpdateAiAgentBody
} from "@synosec/contracts";
import { PrismaClient } from "@prisma/client";
import { RequestError } from "@/shared/http/request-error.js";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapAiAgentRow } from "@/modules/ai-agents/ai-agents.mapper.js";
import { type AiAgentsRepository } from "@/modules/ai-agents/ai-agents.repository.js";

export class PrismaAiAgentsRepository implements AiAgentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: AiAgentsListQuery): Promise<PaginatedResult<AiAgent>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } },
              { systemPrompt: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = query.sortBy === "toolIds"
      ? { tools: { _count: query.sortDirection } }
      : { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.aiAgent.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        include: { tools: { select: { toolId: true, ord: true } } }
      }),
      this.prisma.aiAgent.count({ where })
    ]);

    return {
      items: items.map(mapAiAgentRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<AiAgent | null> {
    const agent = await this.prisma.aiAgent.findUnique({
      where: { id },
      include: { tools: { select: { toolId: true, ord: true } } }
    });
    return agent ? mapAiAgentRow(agent) : null;
  }

  async create(input: CreateAiAgentBody): Promise<AiAgent> {
    await this.assertReferences(input.toolIds);

    const agent = await this.prisma.aiAgent.create({
      data: {
        id: randomUUID(),
        name: input.name,
        status: input.status,
        description: input.description,
        systemPrompt: input.systemPrompt,
        tools: {
          create: input.toolIds.map((toolId, index) => ({
            toolId,
            ord: index
          }))
        }
      },
      include: { tools: { select: { toolId: true, ord: true } } }
    });

    return mapAiAgentRow(agent);
  }

  async update(id: string, input: UpdateAiAgentBody): Promise<AiAgent | null> {
    const current = await this.prisma.aiAgent.findUnique({
      where: { id },
      include: { tools: { select: { toolId: true, ord: true } } }
    });
    if (!current) {
      return null;
    }

    const nextToolIds = input.toolIds ?? current.tools.sort((left, right) => left.ord - right.ord).map((tool) => tool.toolId);
    await this.assertReferences(nextToolIds);

    const agent = await this.prisma.aiAgent.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        status: input.status ?? current.status,
        description: input.description === undefined ? current.description : input.description,
        systemPrompt: input.systemPrompt ?? current.systemPrompt,
        tools: {
          deleteMany: {},
          create: nextToolIds.map((toolId, index) => ({
            toolId,
            ord: index
          }))
        }
      },
      include: { tools: { select: { toolId: true, ord: true } } }
    });

    return mapAiAgentRow(agent);
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.aiAgent.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  private async assertReferences(toolIds: string[]) {
    if (toolIds.length === 0) {
      return;
    }

    const tools = await this.prisma.aiTool.findMany({
      where: { id: { in: toolIds } },
      select: { id: true }
    });
    const foundIds = new Set(tools.map((tool) => tool.id));

    for (const toolId of toolIds) {
      if (!foundIds.has(toolId)) {
        throw new RequestError(400, `AI tool not found: ${toolId}`);
      }
    }
  }
}
