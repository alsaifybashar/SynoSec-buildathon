import { randomUUID } from "node:crypto";
import type { WorkflowRun, WorkflowTraceEntry } from "@synosec/contracts";
import { RequestError } from "../../../platform/core/http/request-error.js";
import type { WorkflowsRepository } from "./workflows.repository.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import type { AiAgentsRepository } from "../ai-agents/ai-agents.repository.js";
import type { AiToolsRepository } from "../ai-tools/ai-tools.repository.js";
import { LocalToolSelectionEvaluator } from "../../../workflows/evals/local-tool-selection-evaluator.js";

export class WorkflowExecutionService {
  private readonly evaluator: LocalToolSelectionEvaluator;

  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly runtimesRepository: RuntimesRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    private readonly aiToolsRepository: AiToolsRepository
  ) {
    this.evaluator = new LocalToolSelectionEvaluator({
      apiPath: "/api/chat"
    });
  }

  async startRun(workflowId: string) {
    const workflow = await this.workflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }
    if (workflow.stages.length === 0) {
      throw new RequestError(400, "Workflow has no stages.");
    }

    const firstAgent = await this.aiAgentsRepository.getById(workflow.stages[0]?.agentId ?? "");
    if (!firstAgent) {
      throw new RequestError(400, "Workflow stage agent not found.");
    }

    if (!firstAgent.name.toLowerCase().startsWith("local ")) {
      throw new RequestError(400, "Workflow runs currently require local agents.");
    }

    const run = await this.workflowsRepository.createRun(workflowId);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    return run;
  }

  async stepRun(runId: string) {
    const run = await this.workflowsRepository.getRunById(runId);
    if (!run) {
      throw new RequestError(404, "Workflow run not found.");
    }
    if (run.status === "completed") {
      throw new RequestError(400, "Workflow run is already complete.");
    }

    const workflow = await this.workflowsRepository.getById(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const stage = workflow.stages.sort((left, right) => left.ord - right.ord)[run.currentStepIndex];
    if (!stage) {
      const completedRun: WorkflowRun = {
        ...run,
        status: "completed",
        completedAt: new Date().toISOString()
      };
      return this.workflowsRepository.updateRun(completedRun);
    }

    const [agent, application, runtime] = await Promise.all([
      this.aiAgentsRepository.getById(stage.agentId),
      this.applicationsRepository.getById(workflow.applicationId),
      workflow.runtimeId ? this.runtimesRepository.getById(workflow.runtimeId) : Promise.resolve(null)
    ]);

    if (!agent) {
      throw new RequestError(400, "Workflow stage agent not found.");
    }
    if (!application) {
      throw new RequestError(400, "Workflow application not found.");
    }
    if (!agent.name.toLowerCase().startsWith("local ")) {
      throw new RequestError(400, "Workflow runs currently require local agents.");
    }

    const tools = (
      await Promise.all(agent.toolIds.map((toolId) => this.aiToolsRepository.getById(toolId)))
    ).filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

    const result = await this.evaluator.evaluate({
      roleName: agent.name,
      systemPrompt: agent.systemPrompt,
      scenarioPrompt: [
        `Workflow stage: ${stage.label}`,
        `Target application: ${application.name}`,
        `Target URL: ${application.baseUrl ?? "not configured"}`,
        runtime ? `Runtime: ${runtime.name} (${runtime.provider}, ${runtime.region})` : "",
        "Choose the best next tools for this workflow stage and summarize why."
      ].filter(Boolean).join("\n"),
      requiredToolCount: Math.min(2, Math.max(1, tools.length)),
      availableTools: tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description ?? tool.name,
        category: tool.category,
        riskTier: tool.riskTier
      }))
    });

    const traceEntry: WorkflowTraceEntry = {
      id: randomUUID(),
      workflowRunId: run.id,
      workflowId: workflow.id,
      workflowStageId: stage.id,
      stepIndex: run.currentStepIndex,
      stageLabel: stage.label,
      agentId: agent.id,
      agentName: agent.name,
      status: "completed",
      selectedToolIds: result.parsed.selectedToolIds,
      toolSelectionReason: result.parsed.reason,
      targetSummary: runtime
        ? `${application.name} at ${application.baseUrl ?? "no url"} via ${runtime.name}`
        : `${application.name} at ${application.baseUrl ?? "no url"}`,
      evidenceHighlights: [
        `Stage ${stage.label} evaluated against ${application.name}.`,
        `Selected tools: ${result.parsed.selectedToolIds.join(", ")}.`
      ],
      outputSummary: result.rawContent,
      createdAt: new Date().toISOString()
    };

    const nextStepIndex = run.currentStepIndex + 1;
    const updatedRun: WorkflowRun = {
      ...run,
      currentStepIndex: nextStepIndex,
      status: nextStepIndex >= workflow.stages.length ? "completed" : "running",
      completedAt: nextStepIndex >= workflow.stages.length ? new Date().toISOString() : null,
      trace: [...run.trace, traceEntry]
    };

    return this.workflowsRepository.updateRun(updatedRun);
  }
}
