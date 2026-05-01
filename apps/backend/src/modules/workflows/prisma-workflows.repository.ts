import { randomUUID } from "node:crypto";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  WorkflowLaunch,
  Workflow,
  WorkflowRun,
  WorkflowTraceEvent,
  WorkflowsListQuery
} from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { RequestError } from "@/shared/http/request-error.js";
import { mapWorkflowLaunchRow, mapWorkflowRow, mapWorkflowRunRow } from "./workflows.mapper.js";
import type { WorkflowRunStatePatch, WorkflowsRepository } from "./workflows.repository.js";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

function hasValidTerminalTraceType(
  run: {
    status: WorkflowRun["status"];
    traceEvents?: Array<{ type: string; ord: number }>;
  }
) {
  const terminalEvent = run.traceEvents?.slice().sort((left, right) => right.ord - left.ord)[0];
  if (!terminalEvent) {
    return false;
  }

  if (run.status === "completed") {
    return terminalEvent.type === "run_completed";
  }

  if (run.status === "failed") {
    return terminalEvent.type === "run_failed";
  }

  return true;
}

function computeWorkflowLaunchStatus(runs: Array<{ status: WorkflowRun["status"]; traceEvents?: Array<{ type: string; ord: number }> }>): WorkflowLaunch["status"] {
  if (runs.length === 0) {
    return "pending";
  }

  if (runs.some((run) => run.status === "running" || run.status === "pending")) {
    return "running";
  }

  if (runs.some((run) => !hasValidTerminalTraceType(run))) {
    return "running";
  }

  if (runs.every((run) => run.status === "completed")) {
    return "completed";
  }

  if (runs.every((run) => run.status === "failed")) {
    return "failed";
  }

  return "partial";
}

function toWorkflowStageCreateManyInput(
  stage: { id?: string | undefined; agentId: string; label: string } & Record<string, unknown>,
  index: number
): Prisma.WorkflowStageCreateManyWorkflowInput {
  const contract = normalizeWorkflowStageContract(stage);
  return {
    id: stage.id ?? randomUUID(),
    agentId: stage.agentId,
    label: stage.label,
    ord: index,
    objective: contract.objective,
    stageSystemPrompt: contract.stageSystemPrompt,
    taskPromptTemplate: null,
    allowedToolIds: contract.allowedToolIds as Prisma.InputJsonValue,
    requiredCapabilities: contract.requiredCapabilities as Prisma.InputJsonValue,
    forbiddenCapabilities: contract.forbiddenCapabilities as Prisma.InputJsonValue,
    requiredEvidenceTypes: contract.requiredEvidenceTypes as Prisma.InputJsonValue,
    findingPolicy: contract.findingPolicy as Prisma.InputJsonValue,
    completionRule: contract.completionRule as Prisma.InputJsonValue,
    resultSchemaVersion: contract.resultSchemaVersion,
    handoffSchema: (contract.handoffSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    tasks: contract.tasks as Prisma.InputJsonValue
  } as Prisma.WorkflowStageCreateManyWorkflowInput;
}

export class PrismaWorkflowsRepository implements WorkflowsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: WorkflowsListQuery): Promise<PaginatedResult<Workflow>> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
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
    const workflow = await this.prisma.workflow.create({
      data: {
        id: randomUUID(),
        name: input.name,
        status: input.status,
        ...(input.executionKind ? { executionKind: input.executionKind } : { executionKind: "workflow" }),
        preRunEvidenceEnabled: input.preRunEvidenceEnabled,
        description: input.description,
        applicationId: null,
        stages: {
          createMany: {
            data: input.stages.map((stage, index) => toWorkflowStageCreateManyInput(stage, index))
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

    const orderedStages = current.stages.sort((left, right) => left.ord - right.ord);
    if (orderedStages.length === 0) {
      throw new RequestError(400, "Workflow is missing its persisted execution contract.");
    }
    const nextStages = input.stages
      ? input.stages
      : orderedStages.map((stage) => ({
          id: stage.id,
          agentId: stage.agentId,
          label: stage.label,
          objective: stage.objective ?? undefined,
          stageSystemPrompt: (stage as { stageSystemPrompt?: string | null }).stageSystemPrompt ?? undefined,
          taskPromptTemplate: (stage as { taskPromptTemplate?: string | null }).taskPromptTemplate ?? undefined,
          allowedToolIds: Array.isArray(stage.allowedToolIds) ? stage.allowedToolIds.map(String) : [],
          requiredCapabilities: Array.isArray((stage as { requiredCapabilities?: unknown }).requiredCapabilities)
            ? ((stage as { requiredCapabilities: unknown[] }).requiredCapabilities).map(String)
            : [],
          forbiddenCapabilities: Array.isArray((stage as { forbiddenCapabilities?: unknown }).forbiddenCapabilities)
            ? ((stage as { forbiddenCapabilities: unknown[] }).forbiddenCapabilities).map(String)
            : [],
          requiredEvidenceTypes: Array.isArray(stage.requiredEvidenceTypes) ? stage.requiredEvidenceTypes.map(String) : [],
          findingPolicy: stage.findingPolicy as Record<string, unknown> | undefined,
          completionRule: stage.completionRule as Record<string, unknown> | undefined,
          resultSchemaVersion: stage.resultSchemaVersion,
          handoffSchema: stage.handoffSchema as Record<string, unknown> | null | undefined,
          ...(Array.isArray((stage as { tasks?: unknown }).tasks)
            ? { tasks: (stage as { tasks: unknown[] }).tasks }
            : {})
        }));

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
          ...(input.preRunEvidenceEnabled === undefined ? {} : { preRunEvidenceEnabled: input.preRunEvidenceEnabled }),
          description: input.description === undefined ? current.description : input.description,
          applicationId: current.applicationId,
          stages: {
            createMany: {
              data: nextStages.map((stage, index) => toWorkflowStageCreateManyInput(stage, index))
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
          ...((stage as { stageSystemPrompt?: string | null }).stageSystemPrompt
            ? { stageSystemPrompt: (stage as { stageSystemPrompt?: string | null }).stageSystemPrompt }
            : {}),
          ...(Array.isArray(stage.allowedToolIds) ? { allowedToolIds: stage.allowedToolIds.map(String) } : {})
        }, fallbackToolIdsByAgentId[stage.id] ?? []);

        await transaction.workflowStage.update({
          where: { id: stage.id },
          data: {
            objective: contract.objective,
            stageSystemPrompt: contract.stageSystemPrompt,
            taskPromptTemplate: null,
            allowedToolIds: contract.allowedToolIds as Prisma.InputJsonValue
          } as Prisma.WorkflowStageUpdateInput
        });
      }

      return transaction.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: { stages: true }
      });
    });

    return mapWorkflowRow(workflow);
  }

  async createLaunch(workflowId: string): Promise<WorkflowLaunch | null> {
    const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      return null;
    }

    const launch = await this.prisma.workflowLaunch.create({
      data: {
        id: randomUUID(),
        workflowId,
        status: "pending"
      },
      include: { runs: true }
    });

    return mapWorkflowLaunchRow(launch as Parameters<typeof mapWorkflowLaunchRow>[0]);
  }

  async getLaunchById(launchId: string): Promise<WorkflowLaunch | null> {
    const launch = await this.prisma.workflowLaunch.findUnique({
      where: { id: launchId },
      include: { runs: true }
    });
    return launch ? mapWorkflowLaunchRow(launch as Parameters<typeof mapWorkflowLaunchRow>[0]) : null;
  }

  async getLatestLaunchByWorkflowId(workflowId: string): Promise<WorkflowLaunch | null> {
    const launch = await this.prisma.workflowLaunch.findFirst({
      where: { workflowId },
      include: { runs: true },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }]
    });
    return launch ? mapWorkflowLaunchRow(launch as Parameters<typeof mapWorkflowLaunchRow>[0]) : null;
  }

  async createRun(
    workflowId: string,
    workflowLaunchId: string,
    targetId: string,
    options?: {
      preRunEvidenceEnabled?: boolean;
      preRunEvidenceOverride?: boolean | null;
    }
  ): Promise<WorkflowRun | null> {
    const workflow = await this.prisma.workflow.findUnique({ where: { id: workflowId } });
    const target = await this.prisma.application.findUnique({ where: { id: targetId } });
    const launch = await this.prisma.workflowLaunch.findUnique({ where: { id: workflowLaunchId } });
    if (!workflow || !target || !launch) {
      return null;
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        id: randomUUID(),
        workflowId,
        workflowLaunchId,
        targetId,
        executionKind: workflow.executionKind ?? "workflow",
        preRunEvidenceEnabled: options?.preRunEvidenceEnabled ?? workflow.preRunEvidenceEnabled,
        preRunEvidenceOverride: options?.preRunEvidenceOverride ?? null,
        status: "running"
      },
      include: { traceEvents: true }
    });

    await this.refreshLaunchState(workflowLaunchId);

    return mapWorkflowRunRow(run as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async getRunById(runId: string): Promise<WorkflowRun | null> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { traceEvents: true }
    });
    return run ? mapWorkflowRunRow(run) : null;
  }

  async appendRunEvent(runId: string, event: WorkflowTraceEvent, patch: WorkflowRunStatePatch = {}): Promise<WorkflowRun> {
    const current = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        traceEvents: {
          orderBy: { ord: "desc" },
          take: 1
        }
      }
    });
    if (!current) {
      throw new RequestError(404, "Workflow run not found.");
    }
    const expectedOrd = (current.traceEvents[0]?.ord ?? -1) + 1;
    if (event.ord !== expectedOrd) {
      throw new RequestError(500, `Workflow trace event ord ${event.ord} is out of sequence for run ${runId}.`);
    }

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

    await this.refreshLaunchState(updated.workflowLaunchId);
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

    await this.refreshLaunchState(updated.workflowLaunchId);
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

    await this.refreshLaunchState(updated.workflowLaunchId);
    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  private async refreshLaunchState(workflowLaunchId: string) {
    const launch = await this.prisma.workflowLaunch.findUnique({
      where: { id: workflowLaunchId },
      include: {
        runs: {
          select: {
            status: true,
            traceEvents: {
              select: {
                type: true,
                ord: true
              },
              orderBy: { ord: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!launch) {
      return;
    }

    const status = computeWorkflowLaunchStatus(launch.runs);
    await this.prisma.workflowLaunch.update({
      where: { id: workflowLaunchId },
      data: {
        status,
        completedAt: status === "running" || status === "pending" ? null : new Date()
      }
    });
  }
}
