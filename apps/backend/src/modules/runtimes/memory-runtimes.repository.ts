import { randomUUID } from "node:crypto";
import type { CreateRuntimeBody, Runtime, UpdateRuntimeBody } from "@synosec/contracts";
import { type RuntimesRepository } from "./runtimes.repository.js";

export class MemoryRuntimesRepository implements RuntimesRepository {
  private readonly records = new Map<string, Runtime>();

  constructor(seed: Runtime[] = []) {
    seed.forEach((runtime) => {
      this.records.set(runtime.id, runtime);
    });
  }

  async list(): Promise<Runtime[]> {
    return [...this.records.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string): Promise<Runtime | null> {
    return this.records.get(id) ?? null;
  }

  async create(input: CreateRuntimeBody): Promise<Runtime> {
    const timestamp = new Date().toISOString();
    const record: Runtime = {
      id: randomUUID(),
      name: input.name,
      serviceType: input.serviceType,
      provider: input.provider,
      environment: input.environment,
      region: input.region,
      status: input.status,
      applicationId: input.applicationId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, input: UpdateRuntimeBody): Promise<Runtime | null> {
    const current = this.records.get(id);

    if (!current) {
      return null;
    }

    const updated: Runtime = {
      id: current.id,
      name: input.name ?? current.name,
      serviceType: input.serviceType ?? current.serviceType,
      provider: input.provider ?? current.provider,
      environment: input.environment ?? current.environment,
      region: input.region ?? current.region,
      status: input.status ?? current.status,
      applicationId: input.applicationId === undefined ? current.applicationId : input.applicationId,
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
