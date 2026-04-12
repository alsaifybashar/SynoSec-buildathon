import { randomUUID } from "node:crypto";
import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@synosec/contracts";
import { type ApplicationsRepository } from "./applications.repository.js";

export class MemoryApplicationsRepository implements ApplicationsRepository {
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
