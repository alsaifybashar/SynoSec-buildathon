import { randomUUID } from "node:crypto";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowsListQuery
} from "@synosec/contracts";
import { PrismaClient } from "../../../platform/generated/prisma/index.js";
import type { PaginatedResult } from "../../../platform/core/pagination/paginated-result.js";
import { RequestError } from "../../../platform/core/http/request-error.js";
import { mapWorkflowRow, mapWorkflowRunRow } from "./workflows.mapper.js";
import type { WorkflowsRepository } from "./workflows.repository.js";

export class PrismaWorkflowsRepository implements WorkflowsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: WorkflowsListQuery): Promise<PaginatedResult<Workflow>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.applicationId ? { applicationId: query.applicationId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = { [query.sortBy ?? "name"]: query.sortDirection };
    const skip = (query.page - 1) * query.pageSize;
    const [matching, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        orderBy,
        include: { stages: true },
        skip,
        take: query.pageSize
      }),
      this.prisma.workflow.count({ where })
    ]);

    return {
      items: matching.map(mapWorkflowRow),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize)
    };
  }

  async getById(id: string): Promise<Workflow | null> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { stages: true }
    });
    return workflow ? mapWorkflowRow(workflow) : null;
  }

  async create(input: CreateWorkflowBody): Promise<Workflow> {
    await this.assertReferences(input.applicationId, input.runtimeId, input.stages.map((stage) => stage.agentId));

    const workflow = await this.prisma.workflow.create({
      data: {
        id: randomUUID(),
        name: input.name,
        status: input.status,
        description: input.description,
        applicationId: input.applicationId,
        runtimeId: input.runtimeId,
        stages: {
          create: input.stages.map((stage, index) => ({
            id: stage.id ?? randomUUID(),
            label: stage.label,
            agentId: stage.agentId,
            ord: index
          }))
        }
      },
      include: { stages: true }
    });

    return mapWorkflowRow(workflow);
  }

  async update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null> {
    const current = await this.prisma.workflow.findUnique({
      where: { id },
      include: { stages: true }
    });
    if (!current) {
      return null;
    }

    const nextStages = input.stages ?? current.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      agentId: stage.agentId
    }));

    await this.assertReferences(
      input.applicationId ?? current.applicationId,
      input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
      nextStages.map((stage) => stage.agentId)
    );

    const workflow = await this.prisma.$transaction(async (transaction) => {
      await transaction.workflowStage.deleteMany({
        where: { workflowId: id }
      });

      return transaction.workflow.update({
        where: { id },
        data: {
          name: input.name ?? current.name,
          status: input.status ?? current.status,
          description: input.description === undefined ? current.description : input.description,
          applicationId: input.applicationId ?? current.applicationId,
          runtimeId: input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
          stages: {
            create: nextStages.map((stage, index) => ({
              id: stage.id ?? randomUUID(),
              label: stage.label,
              agentId: stage.agentId,
              ord: index
            }))
          }
        },
        include: { stages: true }
      });
    });

    return mapWorkflowRow(workflow);
  }

  async remove(id: string): Promise<boolean> {
    const current = await this.prisma.workflow.findUnique({ where: { id } });
    if (!current) {
      return false;
    }

    await this.prisma.workflow.delete({ where: { id } });
    return true;
  }

  async createRun(workflowId: string): Promise<WorkflowRun | null> {
    const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return null;
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        id: randomUUID(),
        workflowId,
        status: "running"
      },
      include: { traceEntries: true }
    });

    return mapWorkflowRunRow(run);
  }

  async getRunById(runId: string): Promise<WorkflowRun | null> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { traceEntries: true }
    });
    return run ? mapWorkflowRunRow(run) : null;
  }

  async updateRun(run: WorkflowRun): Promise<WorkflowRun> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.workflowTraceEntry.deleteMany({
        where: { workflowRunId: run.id }
      });

      return transaction.workflowRun.update({
        where: { id: run.id },
        data: {
          status: run.status,
          currentStepIndex: run.currentStepIndex,
          completedAt: run.completedAt ? new Date(run.completedAt) : null,
          traceEntries: {
            create: run.trace.map((entry) => ({
              id: entry.id,
              workflowId: entry.workflowId,
              workflowStageId: entry.workflowStageId,
              stepIndex: entry.stepIndex,
              stageLabel: entry.stageLabel,
              agentId: entry.agentId,
              agentName: entry.agentName,
              status: entry.status,
              selectedToolIds: entry.selectedToolIds,
              toolSelectionReason: entry.toolSelectionReason,
              targetSummary: entry.targetSummary,
              evidenceHighlights: entry.evidenceHighlights,
              outputSummary: entry.outputSummary,
              createdAt: new Date(entry.createdAt)
            }))
          }
        },
        include: { traceEntries: true }
      });
    });

    return mapWorkflowRunRow(updated);
  }

  private async assertReferences(applicationId: string, runtimeId: string | null, agentIds: string[]) {
    const [application, runtime, agents] = await Promise.all([
      this.prisma.application.findUnique({ where: { id: applicationId } }),
      runtimeId ? this.prisma.runtime.findUnique({ where: { id: runtimeId } }) : Promise.resolve(null),
      this.prisma.aiAgent.findMany({ where: { id: { in: agentIds } } })
    ]);

    if (!application) {
      throw new RequestError(400, "Application not found.");
    }

    if (runtimeId && !runtime) {
      throw new RequestError(400, "Runtime not found.");
    }

    if (agents.length !== new Set(agentIds).size) {
      const knownIds = new Set(agents.map((agent) => agent.id));
      const missingId = agentIds.find((agentId) => !knownIds.has(agentId));
      throw new RequestError(400, `AI agent not found: ${missingId}`);
    }
  }
}
