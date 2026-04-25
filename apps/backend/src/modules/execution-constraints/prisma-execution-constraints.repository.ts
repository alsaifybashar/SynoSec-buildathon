import { randomUUID } from "node:crypto";
import type {
  CreateExecutionConstraintBody,
  ExecutionConstraint,
  ExecutionConstraintsListQuery,
  UpdateExecutionConstraintBody
} from "@synosec/contracts";
import { PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapExecutionConstraintRow } from "./execution-constraints.mapper.js";
import type { ExecutionConstraintsRepository } from "./execution-constraints.repository.js";

export class PrismaExecutionConstraintsRepository implements ExecutionConstraintsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ExecutionConstraintsListQuery): Promise<PaginatedResult<ExecutionConstraint>> {
    const where = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } },
              { provider: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.executionConstraint.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.executionConstraint.count({ where })
    ]);

    return {
      items: rows.map(mapExecutionConstraintRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<ExecutionConstraint | null> {
    const row = await this.prisma.executionConstraint.findUnique({ where: { id } });
    return row ? mapExecutionConstraintRow(row) : null;
  }

  async create(input: CreateExecutionConstraintBody): Promise<ExecutionConstraint> {
    const row = await this.prisma.executionConstraint.create({
      data: {
        id: randomUUID(),
        name: input.name,
        kind: input.kind,
        provider: input.provider,
        version: input.version,
        description: input.description,
        bypassForLocalTargets: input.bypassForLocalTargets,
        denyProviderOwnedTargets: input.denyProviderOwnedTargets,
        requireVerifiedOwnership: input.requireVerifiedOwnership,
        allowActiveExploit: input.allowActiveExploit,
        requireRateLimitSupport: input.requireRateLimitSupport,
        rateLimitRps: input.rateLimitRps,
        requireHostAllowlistSupport: input.requireHostAllowlistSupport,
        requirePathExclusionSupport: input.requirePathExclusionSupport,
        documentationUrls: input.documentationUrls,
        excludedPaths: input.excludedPaths
      }
    });

    return mapExecutionConstraintRow(row);
  }

  async update(id: string, input: UpdateExecutionConstraintBody): Promise<ExecutionConstraint | null> {
    const current = await this.prisma.executionConstraint.findUnique({ where: { id } });
    if (!current) {
      return null;
    }

    const row = await this.prisma.executionConstraint.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        kind: input.kind ?? current.kind,
        provider: input.provider === undefined ? current.provider : input.provider,
        version: input.version ?? current.version,
        description: input.description === undefined ? current.description : input.description,
        bypassForLocalTargets: input.bypassForLocalTargets ?? current.bypassForLocalTargets,
        denyProviderOwnedTargets: input.denyProviderOwnedTargets ?? current.denyProviderOwnedTargets,
        requireVerifiedOwnership: input.requireVerifiedOwnership ?? current.requireVerifiedOwnership,
        allowActiveExploit: input.allowActiveExploit ?? current.allowActiveExploit,
        requireRateLimitSupport: input.requireRateLimitSupport ?? current.requireRateLimitSupport,
        rateLimitRps: input.rateLimitRps === undefined ? current.rateLimitRps : input.rateLimitRps,
        requireHostAllowlistSupport: input.requireHostAllowlistSupport ?? current.requireHostAllowlistSupport,
        requirePathExclusionSupport: input.requirePathExclusionSupport ?? current.requirePathExclusionSupport,
        documentationUrls: input.documentationUrls ?? current.documentationUrls,
        excludedPaths: input.excludedPaths ?? current.excludedPaths
      }
    });

    return mapExecutionConstraintRow(row);
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.executionConstraint.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
