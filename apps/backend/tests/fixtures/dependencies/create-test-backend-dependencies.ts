import { randomUUID } from "node:crypto";
import type {
  AiAgent,
  AiAgentsListQuery,
  AiTool,
  CreateAiAgentBody,
  CreateExecutionConstraintBody,
  CreateTargetBody,
  ExecutionConstraint,
  ExecutionConstraintsListQuery,
  Target,
  TargetsListQuery,
  UpdateAiAgentBody,
  UpdateExecutionConstraintBody,
  UpdateTargetBody,
  Workflow,
  WorkflowRun
} from "@synosec/contracts";
import type { AppDependencies } from "@/app/create-app.js";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { ExecutionConstraintsRepository } from "@/modules/execution-constraints/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import { MemoryWorkflowsRepository } from "@/modules/workflows/memory-workflows.repository.js";
import { paginateItems } from "@/shared/pagination/paginated-result.js";
import { buildAiAgent } from "../builders/ai-agent.js";

function compareValues(left: string | null | undefined, right: string | null | undefined, direction: "asc" | "desc") {
  const normalizedLeft = left ?? "";
  const normalizedRight = right ?? "";
  const result = normalizedLeft.localeCompare(normalizedRight);
  return direction === "desc" ? -result : result;
}

class TestTargetsRepository implements TargetsRepository {
  private readonly items = new Map<string, Target>();

  constructor(seed: Target[] = []) {
    seed.forEach((target) => {
      this.items.set(target.id, target);
    });
  }

  async list(query: TargetsListQuery) {
    const filtered = [...this.items.values()]
      .filter((item) => !query.status || item.status === query.status)
      .filter((item) => !query.environment || item.environment === query.environment)
      .filter((item) => !query.q || item.name.toLowerCase().includes(query.q.toLowerCase()))
      .sort((left, right) => compareValues(left.name, right.name, query.sortDirection));

    return paginateItems(filtered, query.page, query.pageSize);
  }

  async getById(id: string) {
    return this.items.get(id) ?? null;
  }

  async create(input: CreateTargetBody) {
    const target: Target = {
      id: randomUUID(),
      name: input.name,
      baseUrl: input.baseUrl,
      executionBaseUrl: input.executionBaseUrl ?? null,
      environment: input.environment,
      status: input.status,
      lastScannedAt: input.lastScannedAt,
      constraintBindings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.items.set(target.id, target);
    return target;
  }

  async update(id: string, input: UpdateTargetBody) {
    const current = this.items.get(id);
    if (!current) {
      return null;
    }

    const updated: Target = {
      ...current,
      ...input,
      executionBaseUrl: input.executionBaseUrl === undefined ? current.executionBaseUrl ?? null : input.executionBaseUrl,
      updatedAt: new Date().toISOString()
    };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    return this.items.delete(id);
  }
}

class TestAiAgentsRepository implements AiAgentsRepository {
  private readonly items = new Map<string, AiAgent>();

  constructor(seed: AiAgent[] = []) {
    seed.forEach((agent) => {
      this.items.set(agent.id, agent);
    });
  }

  async list(query: AiAgentsListQuery) {
    const filtered = [...this.items.values()]
      .filter((item) => !query.status || item.status === query.status)
      .filter((item) => !query.q || item.name.toLowerCase().includes(query.q.toLowerCase()))
      .sort((left, right) => compareValues(left.name, right.name, query.sortDirection));

    return paginateItems(filtered, query.page, query.pageSize);
  }

  async getById(id: string) {
    return this.items.get(id) ?? null;
  }

  async create(input: CreateAiAgentBody) {
    const agent: AiAgent = {
      id: randomUUID(),
      name: input.name,
      status: input.status,
      description: input.description,
      systemPrompt: input.systemPrompt,
      toolAccessMode: input.toolAccessMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.items.set(agent.id, agent);
    return agent;
  }

  async update(id: string, input: UpdateAiAgentBody) {
    const current = this.items.get(id);
    if (!current) {
      return null;
    }

    const updated: AiAgent = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString()
    };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    return this.items.delete(id);
  }
}

class TestExecutionConstraintsRepository implements ExecutionConstraintsRepository {
  private readonly items = new Map<string, ExecutionConstraint>();

  constructor(seed: ExecutionConstraint[] = []) {
    seed.forEach((constraint) => {
      this.items.set(constraint.id, constraint);
    });
  }

  async list(query: ExecutionConstraintsListQuery) {
    const filtered = [...this.items.values()]
      .filter((item) => !query.kind || item.kind === query.kind)
      .filter((item) => !query.provider || item.provider === query.provider)
      .filter((item) => !query.q || item.name.toLowerCase().includes(query.q.toLowerCase()))
      .sort((left, right) => compareValues(left.name, right.name, query.sortDirection));

    return paginateItems(filtered, query.page, query.pageSize);
  }

  async getById(id: string) {
    return this.items.get(id) ?? null;
  }

  async create(input: CreateExecutionConstraintBody) {
    const constraint: ExecutionConstraint = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.items.set(constraint.id, constraint);
    return constraint;
  }

  async update(id: string, input: UpdateExecutionConstraintBody) {
    const current = this.items.get(id);
    if (!current) {
      return null;
    }

    const updated: ExecutionConstraint = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString()
    };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    return this.items.delete(id);
  }
}

export function createTestBackendDependencies(options: {
  targets?: Target[];
  agents?: AiAgent[];
  tools?: AiTool[];
  workflows?: Workflow[];
  workflowRuns?: WorkflowRun[];
  constraints?: ExecutionConstraint[];
  overrides?: Partial<AppDependencies>;
} = {}): AppDependencies {
  const targetsRepository = new TestTargetsRepository(options.targets ?? []);
  const aiAgentsRepository = new TestAiAgentsRepository(options.agents ?? [buildAiAgent()]);
  const aiToolsRepository = new MemoryAiToolsRepository(options.tools ?? []);
  const executionConstraintsRepository = new TestExecutionConstraintsRepository(options.constraints ?? []);
  const workflowsRepository = new MemoryWorkflowsRepository(
    targetsRepository,
    aiAgentsRepository,
    options.workflows ?? [],
    options.workflowRuns ?? []
  );

  return {
    targetsRepository,
    executionConstraintsRepository,
    aiAgentsRepository,
    aiToolsRepository,
    workflowsRepository,
    ...options.overrides
  };
}
