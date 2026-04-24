import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Application, ApplicationsListQuery, CreateApplicationBody, UpdateApplicationBody } from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapApplicationRow } from "../applications/applications.mapper.js";
import { type ApplicationsRepository } from "../applications/applications.repository.js";

export class PrismaApplicationsRepository implements ApplicationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ApplicationsListQuery): Promise<PaginatedResult<Application>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.environment ? { environment: query.environment } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { baseUrl: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.application.count({ where })
    ]);

    return {
      items: applications.map(mapApplicationRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<Application | null> {
    const application = await this.prisma.application.findUnique({
      where: { id }
    });

    return application ? mapApplicationRow(application) : null;
  }

  async create(input: CreateApplicationBody): Promise<Application> {
    const application = await this.prisma.application.create({
      data: {
        id: randomUUID(),
        name: input.name,
        baseUrl: input.baseUrl,
        environment: input.environment,
        status: input.status,
        lastScannedAt: input.lastScannedAt ? new Date(input.lastScannedAt) : null
      }
    });

    return mapApplicationRow(application);
  }

  async update(id: string, input: UpdateApplicationBody): Promise<Application | null> {
    const current = await this.prisma.application.findUnique({
      where: { id }
    });

    if (!current) {
      return null;
    }

    const application = await this.prisma.application.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        baseUrl: input.baseUrl === undefined ? current.baseUrl : input.baseUrl,
        environment: input.environment ?? current.environment,
        status: input.status ?? current.status,
        lastScannedAt:
          input.lastScannedAt === undefined
            ? current.lastScannedAt
            : input.lastScannedAt
              ? new Date(input.lastScannedAt)
              : null
      }
    });

    return mapApplicationRow(application);
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
