import { randomUUID } from "node:crypto";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowTraceEntry,
  WorkflowTraceEvent,
  WorkflowsListQuery
} from "@synosec/contracts";
import { selectLatestWorkflowRun } from "@synosec/contracts";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import type { AiAgentsRepository } from "../ai-agents/ai-agents.repository.js";
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
    const legacyStage = (input as CreateWorkflowBody & { stages?: Array<Record<string, unknown>> }).stages?.[0];
    const agentId = input.agentId ?? (typeof legacyStage?.["agentId"] === "string" ? legacyStage["agentId"] : "");
    const contractInput = legacyStage
      ? {
          label: typeof legacyStage["label"] === "string" ? legacyStage["label"] : "Workflow Run",
          objective: input.objective ?? legacyStage["objective"],
          allowedToolIds: input.allowedToolIds ?? legacyStage["allowedToolIds"],
          requiredEvidenceTypes: input.requiredEvidenceTypes ?? legacyStage["requiredEvidenceTypes"],
          findingPolicy: input.findingPolicy ?? legacyStage["findingPolicy"],
          completionRule: input.completionRule ?? legacyStage["completionRule"],
          resultSchemaVersion: input.resultSchemaVersion ?? legacyStage["resultSchemaVersion"],
          handoffSchema: input.handoffSchema ?? legacyStage["handoffSchema"]
        }
      : {
          label: "Workflow Run",
          objective: input.objective,
          allowedToolIds: input.allowedToolIds,
          requiredEvidenceTypes: input.requiredEvidenceTypes,
          findingPolicy: input.findingPolicy,
          completionRule: input.completionRule,
          resultSchemaVersion: input.resultSchemaVersion,
          handoffSchema: input.handoffSchema
        };

    await this.assertReferences(input.applicationId, input.runtimeId, [agentId]);
    const timestamp = new Date().toISOString();
    const normalizedContract = normalizeWorkflowStageContract(contractInput);
    const stage = {
      id: randomUUID(),
      label: contractInput.label,
      agentId,
      ord: 0,
      ...normalizedContract
    };
    const workflow: Workflow = {
      id: randomUUID(),
      name: input.name,
      status: input.status,
      description: input.description,
      applicationId: input.applicationId,
      runtimeId: input.runtimeId,
      agentId,
      objective: normalizedContract.objective,
      allowedToolIds: normalizedContract.allowedToolIds,
      requiredEvidenceTypes: normalizedContract.requiredEvidenceTypes,
      findingPolicy: normalizedContract.findingPolicy,
      completionRule: normalizedContract.completionRule,
      resultSchemaVersion: normalizedContract.resultSchemaVersion,
      handoffSchema: normalizedContract.handoffSchema,
      stages: [stage],
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
      label: current.stages[0]?.label ?? "Workflow Run",
      objective: input.objective ?? current.objective,
      allowedToolIds: input.allowedToolIds ?? current.allowedToolIds,
      requiredEvidenceTypes: input.requiredEvidenceTypes ?? current.requiredEvidenceTypes,
      findingPolicy: input.findingPolicy ?? current.findingPolicy,
      completionRule: input.completionRule ?? current.completionRule,
      resultSchemaVersion: input.resultSchemaVersion ?? current.resultSchemaVersion,
      handoffSchema: input.handoffSchema === undefined ? current.handoffSchema : input.handoffSchema
    });

    const updated: Workflow = {
      ...current,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      description: input.description === undefined ? current.description : input.description,
      applicationId: input.applicationId ?? current.applicationId,
      runtimeId: input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
      agentId: input.agentId ?? current.agentId,
      objective: input.objective ?? current.objective,
      allowedToolIds: input.allowedToolIds ?? current.allowedToolIds,
      requiredEvidenceTypes: input.requiredEvidenceTypes ?? current.requiredEvidenceTypes,
      findingPolicy: input.findingPolicy ?? current.findingPolicy,
      completionRule: input.completionRule ?? current.completionRule,
      resultSchemaVersion: input.resultSchemaVersion ?? current.resultSchemaVersion,
      handoffSchema: input.handoffSchema === undefined ? current.handoffSchema : input.handoffSchema,
      stages: [{
        id: current.stages[0]?.id ?? randomUUID(),
        label: current.stages[0]?.label ?? "Workflow Run",
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
      stages: current.stages.map((stage) => ({
        ...stage,
        ...normalizeWorkflowStageContract(stage, fallbackToolIdsByAgentId[stage.agentId] ?? stage.allowedToolIds ?? [])
      })),
      updatedAt: new Date().toISOString()
    };

    const primaryStage = updated.stages[0];
    if (primaryStage) {
      updated.agentId = primaryStage.agentId;
      updated.objective = primaryStage.objective;
      updated.allowedToolIds = primaryStage.allowedToolIds;
      updated.requiredEvidenceTypes = primaryStage.requiredEvidenceTypes;
      updated.findingPolicy = primaryStage.findingPolicy;
      updated.completionRule = primaryStage.completionRule;
      updated.resultSchemaVersion = primaryStage.resultSchemaVersion;
      updated.handoffSchema = primaryStage.handoffSchema;
    }

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

  async appendTraceEntry(runId: string, traceEntry: WorkflowTraceEntry, patch: WorkflowRunStatePatch = {}): Promise<WorkflowRun> {
    const current = this.runs.get(runId);
    if (!current) {
      throw new RequestError(404, "Workflow run not found.");
    }

    const updated: WorkflowRun = {
      ...current,
      ...patch,
      trace: [...current.trace, traceEntry],
      events: current.events.slice()
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
