import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@synosec/contracts";
import { mapApplicationRow } from "./applications.mapper.js";
import { type ApplicationsRepository } from "./applications.repository.js";

export class PrismaApplicationsRepository implements ApplicationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Application[]> {
    const applications = await this.prisma.application.findMany({
      orderBy: { name: "asc" }
    });

    return applications.map(mapApplicationRow);
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
