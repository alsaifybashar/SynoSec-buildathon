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
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { WorkflowRunStatePatch, WorkflowsRepository } from "./workflows.repository.js";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

export class MemoryWorkflowsRepository implements WorkflowsRepository {
  private readonly workflows = new Map<string, Workflow>();
  private readonly runs = new Map<string, WorkflowRun>();

  constructor(
    private readonly targetsRepository: TargetsRepository,
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
      .filter((workflow) => !query.targetId || workflow.targetId === query.targetId)
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
    await this.assertReferences(input.targetId, [agentId]);
    const timestamp = new Date().toISOString();
    const normalizedContract = normalizeWorkflowStageContract({
      label: "Pipeline",
      objective: input.objective,
      stageSystemPrompt: input.stageSystemPrompt,
      taskPromptTemplate: input.taskPromptTemplate,
      allowedToolIds: input.allowedToolIds
    });
    const workflow: Workflow = {
      id: randomUUID(),
      name: input.name,
      status: input.status,
      executionKind: input.executionKind,
      description: input.description,
      targetId: input.targetId,
      agentId,
      objective: normalizedContract.objective,
      stageSystemPrompt: normalizedContract.stageSystemPrompt,
      taskPromptTemplate: normalizedContract.taskPromptTemplate,
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
      input.targetId ?? current.targetId,
      [input.agentId ?? current.agentId]
    );

    const nextStageContract = normalizeWorkflowStageContract({
      label: "Pipeline",
      objective: input.objective ?? current.objective,
      stageSystemPrompt: input.stageSystemPrompt ?? current.stageSystemPrompt,
      taskPromptTemplate: input.taskPromptTemplate ?? current.taskPromptTemplate,
      allowedToolIds: input.allowedToolIds ?? current.allowedToolIds
    });

    const updated: Workflow = {
      ...current,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      executionKind: input.executionKind ?? current.executionKind,
      description: input.description === undefined ? current.description : input.description,
      targetId: input.targetId ?? current.targetId,
      agentId: input.agentId ?? current.agentId,
      objective: nextStageContract.objective,
      stageSystemPrompt: nextStageContract.stageSystemPrompt,
      taskPromptTemplate: nextStageContract.taskPromptTemplate,
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
      stageSystemPrompt: current.stageSystemPrompt,
      taskPromptTemplate: current.taskPromptTemplate,
      allowedToolIds: fallbackToolIdsByAgentId[current.agentId] ?? current.allowedToolIds,
      stages: current.stages.map((stage) => {
        const contract = normalizeWorkflowStageContract({
          label: stage.label,
          objective: stage.objective,
          stageSystemPrompt: stage.stageSystemPrompt,
          taskPromptTemplate: stage.taskPromptTemplate,
          allowedToolIds: fallbackToolIdsByAgentId[stage.agentId] ?? stage.allowedToolIds,
          requiredEvidenceTypes: stage.requiredEvidenceTypes,
          findingPolicy: stage.findingPolicy,
          completionRule: stage.completionRule,
          resultSchemaVersion: stage.resultSchemaVersion,
          handoffSchema: stage.handoffSchema
        });

        return {
          ...stage,
          ...contract
        };
      }),
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(workflowId, updated);
    return updated;
  }

  async createRun(workflowId: string): Promise<WorkflowRun | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    const run: WorkflowRun = {
      id: randomUUID(),
      workflowId,
      executionKind: workflow.executionKind,
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

  private async assertReferences(targetId: string, agentIds: string[]) {
    const targetRecord = await this.targetsRepository.getById(targetId);
    if (!targetRecord) {
      throw new RequestError(400, "Target not found.");
    }

    for (const agentId of agentIds) {
      const agent = await this.aiAgentsRepository.getById(agentId);
      if (!agent) {
        throw new RequestError(400, `AI agent not found: ${agentId}`);
      }
    }
  }
}
