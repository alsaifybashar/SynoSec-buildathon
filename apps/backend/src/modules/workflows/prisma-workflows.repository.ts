import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { CreateWorkflowBody, UpdateWorkflowBody, Workflow } from "@synosec/contracts";
import { RequestError } from "../../core/http/request-error.js";
import { mapWorkflowRow } from "./workflows.mapper.js";
import { type WorkflowsRepository } from "./workflows.repository.js";

export class PrismaWorkflowsRepository implements WorkflowsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Workflow[]> {
    const workflows = await this.prisma.workflow.findMany({
      orderBy: { name: "asc" }
    });

    return workflows.map(mapWorkflowRow);
  }

  async getById(id: string): Promise<Workflow | null> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id }
    });

    return workflow ? mapWorkflowRow(workflow) : null;
  }

  async create(input: CreateWorkflowBody): Promise<Workflow> {
    await this.assertApplicationExists(input.applicationId);

    const workflow = await this.prisma.workflow.create({
      data: {
        id: randomUUID(),
        name: input.name,
        trigger: input.trigger,
        status: input.status,
        maxDepth: input.maxDepth,
        targetMode: input.targetMode,
        applicationId: input.applicationId
      }
    });

    return mapWorkflowRow(workflow);
  }

  async update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null> {
    const current = await this.prisma.workflow.findUnique({
      where: { id }
    });

    if (!current) {
      return null;
    }

    await this.assertApplicationExists(input.applicationId);

    const workflow = await this.prisma.workflow.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        trigger: input.trigger ?? current.trigger,
        status: input.status ?? current.status,
        maxDepth: input.maxDepth ?? current.maxDepth,
        targetMode: input.targetMode ?? current.targetMode,
        applicationId: input.applicationId === undefined ? current.applicationId : input.applicationId
      }
    });

    return mapWorkflowRow(workflow);
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.prisma.workflow.delete({
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
