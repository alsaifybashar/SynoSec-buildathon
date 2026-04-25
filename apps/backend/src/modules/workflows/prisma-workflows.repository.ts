import { randomUUID } from "node:crypto";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowTraceEvent,
  WorkflowsListQuery
} from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { RequestError } from "@/shared/http/request-error.js";
import { mapWorkflowRow, mapWorkflowRunRow } from "./workflows.mapper.js";
import type { WorkflowRunStatePatch, WorkflowsRepository } from "./workflows.repository.js";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

function toWorkflowStageCreateManyInput(
  stage: { id?: string; label: string; agentId: string } & Record<string, unknown>,
  index: number
): Prisma.WorkflowStageCreateManyWorkflowInput {
  const contract = normalizeWorkflowStageContract(stage);

  return {
    id: stage.id ?? randomUUID(),
    label: stage.label,
    agentId: stage.agentId,
    ord: index,
    objective: contract.objective,
    allowedToolIds: contract.allowedToolIds as Prisma.InputJsonValue,
    requiredEvidenceTypes: contract.requiredEvidenceTypes as Prisma.InputJsonValue,
    findingPolicy: contract.findingPolicy as Prisma.InputJsonValue,
    completionRule: contract.completionRule as Prisma.InputJsonValue,
    resultSchemaVersion: contract.resultSchemaVersion,
    handoffSchema: (contract.handoffSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue
  };
}

export class PrismaWorkflowsRepository implements WorkflowsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: WorkflowsListQuery): Promise<PaginatedResult<Workflow>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetId ? { applicationId: query.targetId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const orderBy = query.sortBy === "targetId"
        ? { application: { name: query.sortDirection } }
        : { [query.sortBy ?? "name"]: query.sortDirection };
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
    await this.assertReferences(input.targetId, [input.agentId]);

    const workflow = await this.prisma.workflow.create({
      data: {
        id: randomUUID(),
        name: input.name,
        status: input.status,
        ...(input.executionKind ? { executionKind: input.executionKind } : { executionKind: "workflow" }),
        description: input.description,
        applicationId: input.targetId,
        stages: {
          createMany: {
            data: [toWorkflowStageCreateManyInput({
              label: "Pipeline",
              agentId: input.agentId,
              objective: input.objective,
              allowedToolIds: input.allowedToolIds
            }, 0)]
          }
        }
      }
    });

    const hydrated = await this.prisma.workflow.findUniqueOrThrow({
      where: { id: workflow.id },
      include: { stages: true }
    });

    return mapWorkflowRow(hydrated);
  }

  async update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null> {
    const current = await this.prisma.workflow.findUnique({
      where: { id },
      include: { stages: true }
    });
    if (!current) {
      return null;
    }

    const currentPrimaryStage = current.stages.sort((left, right) => left.ord - right.ord)[0];
    if (!currentPrimaryStage) {
      throw new RequestError(400, "Workflow is missing its persisted execution contract.");
    }
    const nextStage = {
      id: currentPrimaryStage.id,
      label: "Pipeline",
      agentId: input.agentId ?? currentPrimaryStage.agentId,
      objective: input.objective ?? currentPrimaryStage.objective ?? "Run the configured pipeline with the linked agent and approved tools.",
      allowedToolIds: input.allowedToolIds ?? (Array.isArray(currentPrimaryStage.allowedToolIds) ? currentPrimaryStage.allowedToolIds.map(String) : [])
    };

    await this.assertReferences(
      input.targetId ?? current.applicationId,
      [nextStage.agentId]
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
          ...((input.executionKind ?? current.executionKind)
            ? { executionKind: input.executionKind ?? current.executionKind }
            : {}),
          description: input.description === undefined ? current.description : input.description,
          applicationId: input.targetId ?? current.applicationId,
          stages: {
            createMany: {
              data: [toWorkflowStageCreateManyInput({
                label: nextStage.label,
                agentId: nextStage.agentId,
                ...(nextStage.id ? { id: nextStage.id } : {}),
                objective: nextStage.objective,
                allowedToolIds: nextStage.allowedToolIds
              }, 0)]
            }
          }
        }
      });
    });

    const hydrated = await this.prisma.workflow.findUniqueOrThrow({
      where: { id: workflow.id },
      include: { stages: true }
    });

    return mapWorkflowRow(hydrated);
  }

  async remove(id: string): Promise<boolean> {
    const current = await this.prisma.workflow.findUnique({ where: { id } });
    if (!current) {
      return false;
    }

    await this.prisma.workflow.delete({ where: { id } });
    return true;
  }

  async migrateWorkflowStageContracts(workflowId: string, fallbackToolIdsByAgentId: Record<string, string[]> = {}): Promise<Workflow | null> {
    const current = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { stages: true }
    });
    if (!current) {
      return null;
    }

    const workflow = await this.prisma.$transaction(async (transaction) => {
      for (const stage of current.stages) {
        const contract = normalizeWorkflowStageContract({
          label: stage.label,
          ...(stage.objective ? { objective: stage.objective } : {}),
          ...(Array.isArray(stage.allowedToolIds) ? { allowedToolIds: stage.allowedToolIds.map(String) } : {})
        }, fallbackToolIdsByAgentId[stage.agentId] ?? []);

        await transaction.workflowStage.update({
          where: { id: stage.id },
          data: {
            objective: contract.objective,
            allowedToolIds: contract.allowedToolIds as Prisma.InputJsonValue
          }
        });
      }

      return transaction.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: { stages: true }
      });
    });

    return mapWorkflowRow(workflow);
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
        executionKind: workflow.executionKind ?? "workflow",
        status: "running"
      },
      include: { traceEvents: true }
    });

    return mapWorkflowRunRow(run as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async getRunById(runId: string): Promise<WorkflowRun | null> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { traceEvents: true }
    });
    return run ? mapWorkflowRunRow(run) : null;
  }

  async getLatestRunByWorkflowId(workflowId: string): Promise<WorkflowRun | null> {
    const run = await this.prisma.workflowRun.findFirst({
      where: { workflowId },
      include: { traceEvents: true },
      orderBy: [{ startedAt: "desc" }, { completedAt: "desc" }, { id: "desc" }]
    });

    return run ? mapWorkflowRunRow(run) : null;
  }

  async appendRunEvent(runId: string, event: WorkflowTraceEvent, patch: WorkflowRunStatePatch = {}): Promise<WorkflowRun> {
    const updated = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        ...(patch.status === undefined ? {} : { status: patch.status }),
        ...(patch.currentStepIndex === undefined ? {} : { currentStepIndex: patch.currentStepIndex }),
        ...(patch.completedAt === undefined ? {} : { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }),
        traceEvents: {
          create: {
            id: event.id,
            workflowId: event.workflowId,
            workflowStageId: event.workflowStageId,
            stepIndex: event.stepIndex,
            ord: event.ord,
            type: event.type as never,
            status: event.status as never,
            title: event.title,
            summary: event.summary,
            detail: event.detail,
            payload: event.payload as Prisma.InputJsonValue,
            createdAt: new Date(event.createdAt)
          }
        }
      },
      include: { traceEvents: true }
    });

    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async updateRunState(runId: string, patch: WorkflowRunStatePatch): Promise<WorkflowRun> {
    const updated = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        ...(patch.status === undefined ? {} : { status: patch.status }),
        ...(patch.currentStepIndex === undefined ? {} : { currentStepIndex: patch.currentStepIndex }),
        ...(patch.completedAt === undefined ? {} : { completedAt: patch.completedAt ? new Date(patch.completedAt) : null })
      },
      include: { traceEvents: true }
    });

    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async updateRun(run: WorkflowRun): Promise<WorkflowRun> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.workflowTraceEvent.deleteMany({
        where: { workflowRunId: run.id }
      });

      return transaction.workflowRun.update({
        where: { id: run.id },
        data: {
          ...(run.executionKind ? { executionKind: run.executionKind } : {}),
          status: run.status,
          currentStepIndex: run.currentStepIndex,
          completedAt: run.completedAt ? new Date(run.completedAt) : null,
          traceEvents: {
            create: run.events.map((event) => ({
              id: event.id,
              workflowId: event.workflowId,
              workflowStageId: event.workflowStageId,
              stepIndex: event.stepIndex,
              ord: event.ord,
              type: event.type as never,
              status: event.status as never,
              title: event.title,
              summary: event.summary,
              detail: event.detail,
              payload: event.payload,
              createdAt: new Date(event.createdAt)
            })) as never
          }
        },
        include: { traceEvents: true }
      });
    });

    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  private async assertReferences(targetId: string, agentIds: string[]) {
    const [targetRecord, agents] = await Promise.all([
      this.prisma.application.findUnique({ where: { id: targetId } }),
      this.prisma.aiAgent.findMany({ where: { id: { in: agentIds } } })
    ]);

    if (!targetRecord) {
      throw new RequestError(400, "Target not found.");
    }

    if (agents.length !== new Set(agentIds).size) {
      const knownIds = new Set(agents.map((agent) => agent.id));
      const missingId = agentIds.find((agentId) => !knownIds.has(agentId));
      throw new RequestError(400, `AI agent not found: ${missingId}`);
    }
  }
}
