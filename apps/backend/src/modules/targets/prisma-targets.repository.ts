import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { CreateTargetBody, Target, TargetsListQuery, UpdateTargetBody } from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapTargetRow } from "@/modules/targets/targets.mapper.js";
import { type TargetsRepository } from "@/modules/targets/targets.repository.js";

export class PrismaTargetsRepository implements TargetsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: TargetsListQuery): Promise<PaginatedResult<Target>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.environment ? { environment: query.environment } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { baseUrl: { contains: query.q, mode: "insensitive" as const } },
              { executionBaseUrl: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [targets, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy,
        include: {
          constraintBindings: {
            include: {
              constraint: true
            }
          }
        },
        skip,
        take: query.pageSize
      }),
      this.prisma.application.count({ where })
    ]);

    return {
      items: targets.map(mapTargetRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<Target | null> {
    const target = await this.prisma.application.findUnique({
      where: { id },
      include: {
        constraintBindings: {
          include: {
            constraint: true
          }
        }
      }
    });

    return target ? mapTargetRow(target) : null;
  }

  async create(input: CreateTargetBody): Promise<Target> {
    const target = await this.prisma.application.create({
      data: {
        id: randomUUID(),
        name: input.name,
        baseUrl: input.baseUrl,
        executionBaseUrl: input.executionBaseUrl ?? null,
        environment: input.environment,
        status: input.status,
        lastScannedAt: input.lastScannedAt ? new Date(input.lastScannedAt) : null,
        ...(input.constraintIds?.length
          ? {
              constraintBindings: {
                createMany: {
                  data: input.constraintIds.map((constraintId) => ({
                    constraintId
                  }))
                }
              }
            }
          : {})
      },
      include: {
        constraintBindings: {
          include: {
            constraint: true
          }
        }
      }
    });

    return mapTargetRow(target);
  }

  async update(id: string, input: UpdateTargetBody): Promise<Target | null> {
    const current = await this.prisma.application.findUnique({
      where: { id }
    });

    if (!current) {
      return null;
    }

    const target = await this.prisma.application.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        baseUrl: input.baseUrl === undefined ? current.baseUrl : input.baseUrl,
        executionBaseUrl: input.executionBaseUrl === undefined ? current.executionBaseUrl : input.executionBaseUrl,
        environment: input.environment ?? current.environment,
        status: input.status ?? current.status,
        lastScannedAt:
          input.lastScannedAt === undefined
            ? current.lastScannedAt
            : input.lastScannedAt
              ? new Date(input.lastScannedAt)
              : null,
        ...(input.constraintIds === undefined
          ? {}
          : {
              constraintBindings: {
                deleteMany: {},
                createMany: {
                  data: input.constraintIds.map((constraintId) => ({
                    constraintId
                  }))
                }
              }
            }),
      },
      include: {
        constraintBindings: {
          include: {
            constraint: true
          }
        }
      }
    });

    return mapTargetRow(target);
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.application.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }
}
