import { randomUUID } from "node:crypto";
import type { CreateWorkflowBody, UpdateWorkflowBody, Workflow } from "@synosec/contracts";
import { type WorkflowsRepository } from "./workflows.repository.js";

export class MemoryWorkflowsRepository implements WorkflowsRepository {
  private readonly records = new Map<string, Workflow>();

  constructor(seed: Workflow[] = []) {
    seed.forEach((workflow) => {
      this.records.set(workflow.id, workflow);
    });
  }

  async list(): Promise<Workflow[]> {
    return [...this.records.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string): Promise<Workflow | null> {
    return this.records.get(id) ?? null;
  }

  async create(input: CreateWorkflowBody): Promise<Workflow> {
    const timestamp = new Date().toISOString();
    const record: Workflow = {
      id: randomUUID(),
      name: input.name,
      trigger: input.trigger,
      status: input.status,
      maxDepth: input.maxDepth,
      targetMode: input.targetMode,
      applicationId: input.applicationId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null> {
    const current = this.records.get(id);

    if (!current) {
      return null;
    }

    const updated: Workflow = {
      id: current.id,
      name: input.name ?? current.name,
      trigger: input.trigger ?? current.trigger,
      status: input.status ?? current.status,
      maxDepth: input.maxDepth ?? current.maxDepth,
      targetMode: input.targetMode ?? current.targetMode,
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
