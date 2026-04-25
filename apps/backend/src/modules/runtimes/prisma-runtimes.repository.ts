import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { CreateRuntimeBody, RuntimesListQuery, Runtime, RuntimeProvider, UpdateRuntimeBody } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { mapRuntimeRow } from "@/modules/runtimes/runtimes.mapper.js";
import { type RuntimesRepository } from "@/modules/runtimes/runtimes.repository.js";

function mapProvider(provider: RuntimeProvider) {
  return provider === "on-prem" ? "on_prem" : provider;
}

export class PrismaRuntimesRepository implements RuntimesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: RuntimesListQuery): Promise<PaginatedResult<Runtime>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: mapProvider(query.provider) as never } : {}),
      ...(query.environment ? { environment: query.environment } : {}),
      ...(query.applicationId ? { applicationId: query.applicationId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { region: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = query.sortBy === "applicationId"
      ? { application: { name: query.sortDirection } }
      : { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [runtimes, total] = await Promise.all([
      this.prisma.runtime.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.runtime.count({ where })
    ]);

    return {
      items: runtimes.map(mapRuntimeRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<Runtime | null> {
    const runtime = await this.prisma.runtime.findUnique({
      where: { id }
    });

    return runtime ? mapRuntimeRow(runtime) : null;
  }

  async create(input: CreateRuntimeBody): Promise<Runtime> {
    await this.assertApplicationExists(input.applicationId);

    const runtime = await this.prisma.runtime.create({
      data: {
        id: randomUUID(),
        name: input.name,
        serviceType: input.serviceType,
        provider: mapProvider(input.provider),
        environment: input.environment,
        region: input.region,
        status: input.status,
        applicationId: input.applicationId
      }
    });

    return mapRuntimeRow(runtime);
  }

  async update(id: string, input: UpdateRuntimeBody): Promise<Runtime | null> {
    const current = await this.prisma.runtime.findUnique({
      where: { id }
    });

    if (!current) {
      return null;
    }

    await this.assertApplicationExists(input.applicationId);

    const runtime = await this.prisma.runtime.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        serviceType: input.serviceType ?? current.serviceType,
        provider: input.provider ? mapProvider(input.provider) : current.provider,
        environment: input.environment ?? current.environment,
        region: input.region ?? current.region,
        status: input.status ?? current.status,
        applicationId: input.applicationId === undefined ? current.applicationId : input.applicationId
      }
    });

    return mapRuntimeRow(runtime);
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.runtime.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  private async assertApplicationExists(applicationId: string | null | undefined) {
    if (!applicationId) {
      return;
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true }
    });

    if (!application) {
      throw new RequestError(400, "Application not found.");
    }
  }
}
