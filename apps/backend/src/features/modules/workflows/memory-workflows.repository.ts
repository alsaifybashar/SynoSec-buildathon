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
import { paginateItems, type PaginatedResult } from "../../../platform/core/pagination/paginated-result.js";
import { RequestError } from "../../../platform/core/http/request-error.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import type { AiAgentsRepository } from "../ai-agents/ai-agents.repository.js";
import type { WorkflowRunStatePatch, WorkflowsRepository } from "./workflows.repository.js";

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
    await this.assertReferences(input.applicationId, input.runtimeId, input.stages.map((stage) => stage.agentId));
    const timestamp = new Date().toISOString();
    const workflow: Workflow = {
      id: randomUUID(),
      name: input.name,
      status: input.status,
      description: input.description,
      applicationId: input.applicationId,
      runtimeId: input.runtimeId,
      stages: input.stages.map((stage, index) => ({
        id: stage.id ?? randomUUID(),
        label: stage.label,
        agentId: stage.agentId,
        ord: index
      })),
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
      (input.stages ?? current.stages).map((stage) => stage.agentId)
    );

    const updated: Workflow = {
      ...current,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      description: input.description === undefined ? current.description : input.description,
      applicationId: input.applicationId ?? current.applicationId,
      runtimeId: input.runtimeId === undefined ? current.runtimeId : input.runtimeId,
      stages: (input.stages ?? current.stages).map((stage, index) => ({
        id: stage.id ?? randomUUID(),
        label: stage.label,
        agentId: stage.agentId,
        ord: index
      })),
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.workflows.delete(id);
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
    const matchingRuns = [...this.runs.values()]
      .filter((run) => run.workflowId === workflowId)
      .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());

    return matchingRuns[0] ?? null;
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
