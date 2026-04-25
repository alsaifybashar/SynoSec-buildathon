import { randomUUID } from "node:crypto";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowTraceEvent,
  WorkflowsListQuery
} from "@synosec/contracts";
import { selectLatestWorkflowRun } from "@synosec/contracts";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { ApplicationsRepository } from "@/modules/applications/index.js";
import type { RuntimesRepository } from "@/modules/runtimes/index.js";
import type { WorkflowRunStatePatch, WorkflowsRepository } from "./workflows.repository.js";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

export class MemoryWorkflowsRepository implements WorkflowsRepository {
  private readonly workflows = new Map<string, Workflow>();
  private readonly runs = new Map<string, WorkflowRun>();

  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly runtimesRepository: RuntimesRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    seed: Workflow[] = [],
    seedRuns: WorkflowRun[] = []
  ) {
    seed.forEach((workflow) => {
      this.workflows.set(workflow.id, workflow);
    });
    seedRuns.forEach((run) => {
      this.runs.set(run.id, run);
    });
  }

  async list(query: WorkflowsListQuery): Promise<PaginatedResult<Workflow>> {
    const normalizedQuery = query.q?.trim().toLowerCase();
    const sorted = [...this.workflows.values()]
      .filter((workflow) => !query.status || workflow.status === query.status)
      .filter((workflow) => !query.applicationId || workflow.applicationId === query.applicationId)
      .filter((workflow) => {
        if (!normalizedQuery) {
          return true;
        }

        return [workflow.name, workflow.description ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const sortBy = query.sortBy ?? "name";
        const direction = query.sortDirection === "desc" ? -1 : 1;
        const leftValue = left[sortBy];
        const rightValue = right[sortBy];

        if (leftValue === rightValue) {
          return left.name.localeCompare(right.name) * direction;
        }

        return (leftValue > rightValue ? 1 : -1) * direction;
      });

    return paginateItems(sorted, query.page, query.pageSize);
  }

  async getById(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) ?? null;
  }

  async create(input: CreateWorkflowBody): Promise<Workflow> {
    const agentId = input.agentId;
    await this.assertReferences(input.applicationId, input.runtimeId, [agentId]);
    const timestamp = new Date().toISOString();
    const normalizedContract = normalizeWorkflowStageContract({
      label: "Pipeline",
      objective: input.objective,
      allowedToolIds: input.allowedToolIds
    });
    const workflow: Workflow = {
      id: randomUUID(),
      name: input.name,
      status: input.status,
      executionKind: input.executionKind,
      description: input.description,
      applicationId: input.applicationId,
      runtimeId: input.runtimeId,
      agentId,
      objective: normalizedContract.objective,
      allowedToolIds: normalizedContract.allowedToolIds,
      requiredEvidenceTypes: [],
      findingPolicy: normalizedContract.findingPolicy,
      completionRule: normalizedContract.completionRule,
      resultSchemaVersion: normalizedContract.resultSchemaVersion,
      handoffSchema: normalizedContract.handoffSchema,
      stages: [{
        id: randomUUID(),
        label: "Pipeline",
        agentId,
        ord: 0,
        ...normalizedContract
      }],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null> {
    const current = this.workflows.get(id);
    if (!current) {
      return null;
    }

    await this.assertReferences(
      input.applicationId ?? current.applicationId,
      input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
      [input.agentId ?? current.agentId]
    );

    const nextStageContract = normalizeWorkflowStageContract({
      label: "Pipeline",
      objective: input.objective ?? current.objective,
      allowedToolIds: input.allowedToolIds ?? current.allowedToolIds
    });

    const updated: Workflow = {
      ...current,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      executionKind: input.executionKind ?? current.executionKind,
      description: input.description === undefined ? current.description : input.description,
      applicationId: input.applicationId ?? current.applicationId,
      runtimeId: input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
      agentId: input.agentId ?? current.agentId,
      objective: nextStageContract.objective,
      allowedToolIds: nextStageContract.allowedToolIds,
      requiredEvidenceTypes: current.requiredEvidenceTypes ?? [],
      findingPolicy: current.findingPolicy ?? nextStageContract.findingPolicy,
      completionRule: current.completionRule ?? nextStageContract.completionRule,
      resultSchemaVersion: current.resultSchemaVersion ?? nextStageContract.resultSchemaVersion,
      handoffSchema: current.handoffSchema ?? nextStageContract.handoffSchema,
      stages: [{
        id: current.stages[0]?.id ?? randomUUID(),
        label: "Pipeline",
        agentId: input.agentId ?? current.agentId,
        ord: 0,
        ...nextStageContract
      }],
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  async migrateWorkflowStageContracts(workflowId: string, fallbackToolIdsByAgentId: Record<string, string[]> = {}): Promise<Workflow | null> {
    const current = this.workflows.get(workflowId);
    if (!current) {
      return null;
    }

    const updated: Workflow = {
      ...current,
      objective: current.objective,
      allowedToolIds: fallbackToolIdsByAgentId[current.agentId] ?? current.allowedToolIds,
      stages: current.stages,
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(workflowId, updated);
    return updated;
  }

  async createRun(workflowId: string, targetAssetId: string | null): Promise<WorkflowRun | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    const run: WorkflowRun = {
      id: randomUUID(),
      workflowId,
      executionKind: workflow.executionKind,
      targetAssetId,
      status: "running",
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      trace: [],
      events: []
    };

    this.runs.set(run.id, run);
    return run;
  }

  async getRunById(runId: string): Promise<WorkflowRun | null> {
    return this.runs.get(runId) ?? null;
  }

  async getLatestRunByWorkflowId(workflowId: string): Promise<WorkflowRun | null> {
    return selectLatestWorkflowRun(
      [...this.runs.values()].filter((run) => run.workflowId === workflowId)
    );
  }

  async appendRunEvent(runId: string, event: WorkflowTraceEvent, patch: WorkflowRunStatePatch = {}): Promise<WorkflowRun> {
    const current = this.runs.get(runId);
    if (!current) {
      throw new RequestError(404, "Workflow run not found.");
    }

    const updated: WorkflowRun = {
      ...current,
      ...patch,
      trace: current.trace.slice(),
      events: [...current.events, event]
    };
    this.runs.set(runId, updated);
    return updated;
  }

  async updateRunState(runId: string, patch: WorkflowRunStatePatch): Promise<WorkflowRun> {
    const current = this.runs.get(runId);
    if (!current) {
      throw new RequestError(404, "Workflow run not found.");
    }

    const updated: WorkflowRun = {
      ...current,
      ...patch,
      trace: current.trace.slice(),
      events: current.events.slice()
    };
    this.runs.set(runId, updated);
    return updated;
  }

  async updateRun(run: WorkflowRun): Promise<WorkflowRun> {
    this.runs.set(run.id, run);
    return run;
  }

  private async assertReferences(applicationId: string, runtimeId: string | null, agentIds: string[]) {
    const application = await this.applicationsRepository.getById(applicationId);
    if (!application) {
      throw new RequestError(400, "Application not found.");
    }

    if (runtimeId) {
      const runtime = await this.runtimesRepository.getById(runtimeId);
      if (!runtime) {
        throw new RequestError(400, "Runtime not found.");
      }
    }

    for (const agentId of agentIds) {
      const agent = await this.aiAgentsRepository.getById(agentId);
      if (!agent) {
        throw new RequestError(400, `AI agent not found: ${agentId}`);
      }
    }
  }
}
