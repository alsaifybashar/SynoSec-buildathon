import { randomUUID } from "node:crypto";
import { PrismaClient, type Application as PrismaApplication } from "../generated/prisma/index.js";
import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@synosec/contracts";
import { prisma } from "../core/database/prisma-client.js";

export interface ApplicationStore {
  list(): Promise<Application[]>;
  getById(id: string): Promise<Application | null>;
  create(input: CreateApplicationBody): Promise<Application>;
  update(id: string, input: UpdateApplicationBody): Promise<Application | null>;
  remove(id: string): Promise<boolean>;
}

function mapApplicationRow(row: PrismaApplication): Application {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    environment: row.environment,
    status: row.status,
    lastScannedAt: row.lastScannedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export class PostgresApplicationStore implements ApplicationStore {
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

export class InMemoryApplicationStore implements ApplicationStore {
  private readonly records = new Map<string, Application>();

  constructor(seed: Application[] = []) {
    seed.forEach((application) => {
      this.records.set(application.id, application);
    });
  }

  async list(): Promise<Application[]> {
    return [...this.records.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string): Promise<Application | null> {
    return this.records.get(id) ?? null;
  }

  async create(input: CreateApplicationBody): Promise<Application> {
    const timestamp = new Date().toISOString();
    const record: Application = {
      id: randomUUID(),
      name: input.name,
      baseUrl: input.baseUrl,
      environment: input.environment,
      status: input.status,
      lastScannedAt: input.lastScannedAt,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, input: UpdateApplicationBody): Promise<Application | null> {
    const current = this.records.get(id);

    if (!current) {
      return null;
    }

    const updated: Application = {
      id: current.id,
      name: input.name ?? current.name,
      baseUrl: input.baseUrl === undefined ? current.baseUrl : input.baseUrl,
      environment: input.environment ?? current.environment,
      status: input.status ?? current.status,
      lastScannedAt: input.lastScannedAt === undefined ? current.lastScannedAt : input.lastScannedAt,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.records.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.records.delete(id);
  }
}

export function createApplicationStoreFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PostgresApplicationStore(prisma);
}
