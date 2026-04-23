import { randomUUID } from "node:crypto";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowStage,
  WorkflowTraceEntry,
  WorkflowTraceEvent,
  WorkflowsListQuery
} from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import type { PaginatedResult } from "../../../core/pagination/paginated-result.js";
import { RequestError } from "../../../core/http/request-error.js";
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

type PersistedWorkflowStageInput = {
  id?: string;
  label: string;
  agentId: string;
  objective: WorkflowStage["objective"];
  allowedToolIds: WorkflowStage["allowedToolIds"];
  requiredEvidenceTypes: WorkflowStage["requiredEvidenceTypes"];
  findingPolicy: WorkflowStage["findingPolicy"];
  completionRule: WorkflowStage["completionRule"];
  resultSchemaVersion: WorkflowStage["resultSchemaVersion"];
  handoffSchema: WorkflowStage["handoffSchema"];
};

function toWorkflowTraceEntryCreateInput(
  traceEntry: WorkflowTraceEntry
): Prisma.WorkflowTraceEntryUncheckedCreateWithoutWorkflowRunInput {
  if (!traceEntry.workflowStageId) {
    throw new RequestError(400, "Workflow trace entries must reference a workflow stage.");
  }

  return {
    id: traceEntry.id,
    workflowId: traceEntry.workflowId,
    workflowStageId: traceEntry.workflowStageId,
    stepIndex: traceEntry.stepIndex,
    stageLabel: traceEntry.stageLabel,
    agentId: traceEntry.agentId,
    agentName: traceEntry.agentName,
    status: traceEntry.status,
    selectedToolIds: traceEntry.selectedToolIds,
    toolSelectionReason: traceEntry.toolSelectionReason,
    targetSummary: traceEntry.targetSummary,
    evidenceHighlights: traceEntry.evidenceHighlights,
    outputSummary: traceEntry.outputSummary,
    createdAt: new Date(traceEntry.createdAt)
  };
}

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
    const orderBy = query.sortBy === "applicationId"
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
    await this.assertReferences(input.applicationId, input.runtimeId, [input.agentId]);

    const workflow = await this.prisma.workflow.create({
      data: {
        id: randomUUID(),
        name: input.name,
        status: input.status,
        description: input.description,
        applicationId: input.applicationId,
        runtimeId: input.runtimeId,
        stages: {
          createMany: {
            data: [toWorkflowStageCreateManyInput({
              label: "Workflow Run",
              agentId: input.agentId,
              objective: input.objective,
              allowedToolIds: input.allowedToolIds,
              requiredEvidenceTypes: input.requiredEvidenceTypes,
              findingPolicy: input.findingPolicy,
              completionRule: input.completionRule,
              resultSchemaVersion: input.resultSchemaVersion,
              handoffSchema: input.handoffSchema
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
    const nextStage: PersistedWorkflowStageInput = {
      id: currentPrimaryStage.id,
      label: currentPrimaryStage.label,
      agentId: input.agentId ?? currentPrimaryStage.agentId,
      objective: input.objective ?? currentPrimaryStage.objective ?? `Complete the ${currentPrimaryStage.label} workflow using allowed tools and structured reporting.`,
      allowedToolIds: input.allowedToolIds ?? (Array.isArray(currentPrimaryStage.allowedToolIds) ? currentPrimaryStage.allowedToolIds.map(String) : []),
      requiredEvidenceTypes: input.requiredEvidenceTypes ?? (Array.isArray(currentPrimaryStage.requiredEvidenceTypes) ? currentPrimaryStage.requiredEvidenceTypes.map(String) : []),
      findingPolicy: input.findingPolicy
        ?? (currentPrimaryStage.findingPolicy && typeof currentPrimaryStage.findingPolicy === "object" && !Array.isArray(currentPrimaryStage.findingPolicy)
          ? currentPrimaryStage.findingPolicy as WorkflowStage["findingPolicy"]
          : normalizeWorkflowStageContract({ label: currentPrimaryStage.label }).findingPolicy),
      completionRule: input.completionRule
        ?? (currentPrimaryStage.completionRule && typeof currentPrimaryStage.completionRule === "object" && !Array.isArray(currentPrimaryStage.completionRule)
          ? currentPrimaryStage.completionRule as WorkflowStage["completionRule"]
          : normalizeWorkflowStageContract({ label: currentPrimaryStage.label }).completionRule),
      resultSchemaVersion: input.resultSchemaVersion ?? currentPrimaryStage.resultSchemaVersion,
      handoffSchema: input.handoffSchema !== undefined
        ? input.handoffSchema
        : currentPrimaryStage.handoffSchema && typeof currentPrimaryStage.handoffSchema === "object" && !Array.isArray(currentPrimaryStage.handoffSchema)
          ? currentPrimaryStage.handoffSchema as WorkflowStage["handoffSchema"]
          : null
    };

    await this.assertReferences(
      input.applicationId ?? current.applicationId,
      input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
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
          description: input.description === undefined ? current.description : input.description,
          applicationId: input.applicationId ?? current.applicationId,
          runtimeId: input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
          stages: {
            createMany: {
              data: [toWorkflowStageCreateManyInput({
                label: nextStage.label,
                agentId: nextStage.agentId,
                ...(nextStage.id ? { id: nextStage.id } : {}),
                objective: nextStage.objective,
                allowedToolIds: nextStage.allowedToolIds,
                requiredEvidenceTypes: nextStage.requiredEvidenceTypes,
                findingPolicy: nextStage.findingPolicy,
                completionRule: nextStage.completionRule,
                resultSchemaVersion: nextStage.resultSchemaVersion,
                handoffSchema: nextStage.handoffSchema
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
          ...(Array.isArray(stage.allowedToolIds) ? { allowedToolIds: stage.allowedToolIds.map(String) } : {}),
          ...(Array.isArray(stage.requiredEvidenceTypes) ? { requiredEvidenceTypes: stage.requiredEvidenceTypes.map(String) } : {}),
          ...(stage.findingPolicy && typeof stage.findingPolicy === "object" && !Array.isArray(stage.findingPolicy)
            ? { findingPolicy: stage.findingPolicy as Record<string, unknown> }
            : {}),
          ...(stage.completionRule && typeof stage.completionRule === "object" && !Array.isArray(stage.completionRule)
            ? { completionRule: stage.completionRule as Record<string, unknown> }
            : {}),
          resultSchemaVersion: stage.resultSchemaVersion,
          ...(stage.handoffSchema && typeof stage.handoffSchema === "object" && !Array.isArray(stage.handoffSchema)
            ? { handoffSchema: stage.handoffSchema as Record<string, unknown> }
            : {})
        }, fallbackToolIdsByAgentId[stage.agentId] ?? []);

        await transaction.workflowStage.update({
          where: { id: stage.id },
          data: {
            objective: contract.objective,
            allowedToolIds: contract.allowedToolIds as Prisma.InputJsonValue,
            requiredEvidenceTypes: contract.requiredEvidenceTypes as Prisma.InputJsonValue,
            findingPolicy: contract.findingPolicy as Prisma.InputJsonValue,
            completionRule: contract.completionRule as Prisma.InputJsonValue,
            resultSchemaVersion: contract.resultSchemaVersion,
            handoffSchema: (contract.handoffSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue
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
        status: "running"
      },
      include: { traceEntries: true, traceEvents: true }
    });

    return mapWorkflowRunRow(run as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async getRunById(runId: string): Promise<WorkflowRun | null> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { traceEntries: true, traceEvents: true }
    });
    return run ? mapWorkflowRunRow(run) : null;
  }

  async getLatestRunByWorkflowId(workflowId: string): Promise<WorkflowRun | null> {
    const run = await this.prisma.workflowRun.findFirst({
      where: { workflowId },
      include: { traceEntries: true, traceEvents: true },
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
            type: event.type,
            status: event.status,
            title: event.title,
            summary: event.summary,
            detail: event.detail,
            payload: event.payload as Prisma.InputJsonValue,
            createdAt: new Date(event.createdAt)
          }
        }
      },
      include: { traceEntries: true, traceEvents: true }
    });

    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async appendTraceEntry(runId: string, traceEntry: WorkflowTraceEntry, patch: WorkflowRunStatePatch = {}): Promise<WorkflowRun> {
    const updated = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        ...(patch.status === undefined ? {} : { status: patch.status }),
        ...(patch.currentStepIndex === undefined ? {} : { currentStepIndex: patch.currentStepIndex }),
        ...(patch.completedAt === undefined ? {} : { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }),
        traceEntries: {
          create: toWorkflowTraceEntryCreateInput(traceEntry)
        }
      },
      include: { traceEntries: true, traceEvents: true }
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
      include: { traceEntries: true, traceEvents: true }
    });

    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
  }

  async updateRun(run: WorkflowRun): Promise<WorkflowRun> {
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.workflowTraceEntry.deleteMany({
        where: { workflowRunId: run.id }
      });
      await transaction.workflowTraceEvent.deleteMany({
        where: { workflowRunId: run.id }
      });

      return transaction.workflowRun.update({
        where: { id: run.id },
        data: {
          status: run.status,
          currentStepIndex: run.currentStepIndex,
          completedAt: run.completedAt ? new Date(run.completedAt) : null,
          traceEntries: {
            create: run.trace.map(toWorkflowTraceEntryCreateInput)
          },
          traceEvents: {
            create: run.events.map((event) => ({
              id: event.id,
              workflowId: event.workflowId,
              workflowStageId: event.workflowStageId,
              stepIndex: event.stepIndex,
              ord: event.ord,
              type: event.type,
              status: event.status,
              title: event.title,
              summary: event.summary,
              detail: event.detail,
              payload: event.payload,
              createdAt: new Date(event.createdAt)
            })) as never
          }
        },
        include: { traceEntries: true, traceEvents: true }
      });
    });

    return mapWorkflowRunRow(updated as Parameters<typeof mapWorkflowRunRow>[0]);
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
