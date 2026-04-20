import { randomUUID } from "node:crypto";
import type {
  OsiLayer,
  Scan,
  ToolRequest,
  ToolRun,
  WorkflowRun,
  WorkflowTraceEntry,
  WorkflowTraceEvent
} from "@synosec/contracts";
import { localDemoTargetDefaults } from "@synosec/contracts";
import { RequestError } from "../../../platform/core/http/request-error.js";
import { createScan, getScan } from "../../../platform/db/scan-store.js";
import { compileToolRequestFromDefinition } from "../ai-tools/tool-definition.compiler.js";
import type { WorkflowsRepository } from "./workflows.repository.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import type { AiAgentsRepository } from "../ai-agents/ai-agents.repository.js";
import type { AiProvidersRepository } from "../ai-providers/ai-providers.repository.js";
import type { AiToolsRepository } from "../ai-tools/ai-tools.repository.js";
import { LocalToolSelectionEvaluator } from "../../../workflows/evals/local-tool-selection-evaluator.js";
import { ToolBroker } from "../../../workflows/broker/tool-broker.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

function truncate(value: string, maxLength = 220) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function parseTarget(baseUrl: string | null | undefined) {
  const url = new URL(baseUrl ?? localDemoTargetDefaults.hostUrl);
  const port = url.port ? Number(url.port) : undefined;

  return {
    baseUrl: url.toString(),
    host: url.hostname,
    ...(port === undefined ? {} : { port })
  };
}

function inferLayer(category: string): OsiLayer {
  if (category === "network" || category === "dns" || category === "subdomain") {
    return "L4";
  }

  return "L7";
}

function createWorkflowScan(run: WorkflowRun, target: { host: string }): Scan {
  return {
    id: run.id,
    scope: {
      targets: [target.host],
      exclusions: [],
      layers: ["L4", "L7"],
      maxDepth: 3,
      maxDurationMinutes: 15,
      rateLimitRps: 5,
      allowActiveExploits: true,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "live"
    },
    status: "running",
    currentRound: 0,
    tacticsTotal: 1,
    tacticsComplete: 0,
    createdAt: run.startedAt
  };
}

type ExecutedToolResult =
  | {
      mode: "executed";
      toolRequest: ToolRequest;
      toolRun: ToolRun;
      observationSummaries: string[];
      findingSummaries: string[];
      outputPreview: string;
      fullOutput: string;
      durationMs: number;
      configuredTimeoutMs: number | null;
      timedOut: boolean;
    }
  | {
      mode: "virtual";
      toolSummary: string;
      outputPreview: string;
      fullOutput: string;
      durationMs: number;
    };

function isExecutedToolResult(
  value: ExecutedToolResult
): value is Extract<ExecutedToolResult, { mode: "executed" }> {
  return value.mode === "executed";
}

export class WorkflowExecutionService {
  private readonly evaluator: LocalToolSelectionEvaluator;
  private readonly broker: ToolBroker;

  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly runtimesRepository: RuntimesRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    private readonly aiProvidersRepository: AiProvidersRepository,
    private readonly aiToolsRepository: AiToolsRepository,
    private readonly workflowRunStream: WorkflowRunStream
  ) {
    this.evaluator = new LocalToolSelectionEvaluator({
      apiPath: "/api/chat"
    });
    this.broker = new ToolBroker({ broadcast: () => undefined });
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

    const firstProvider = await this.aiProvidersRepository.getById(firstAgent.providerId);
    if (firstProvider?.kind !== "local") {
      throw new RequestError(400, "Workflow runs currently require local agents.");
    }

    const run = await this.workflowsRepository.createRun(workflowId);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    this.publishSnapshot(run);
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
    if (run.status === "failed") {
      throw new RequestError(400, "Workflow run has failed.");
    }

    const workflow = await this.workflowsRepository.getById(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const orderedStages = workflow.stages.slice().sort((left, right) => left.ord - right.ord);
    const stage = orderedStages[run.currentStepIndex];
    if (!stage) {
      const completedRun = await this.workflowsRepository.updateRunState(run.id, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
      this.publishSnapshot(completedRun);
      return completedRun;
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

    const provider = await this.aiProvidersRepository.getById(agent.providerId);
    if (provider?.kind !== "local") {
      throw new RequestError(400, "Workflow runs currently require local agents.");
    }

    const target = parseTarget(application.baseUrl);
    const scan = await this.ensureWorkflowScan(run, target);
    const tools = (
      await Promise.all(agent.toolIds.map((toolId) => this.aiToolsRepository.getById(toolId)))
    ).filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

    let currentRun = run;
    let nextOrd = currentRun.events.length;

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: currentRun.currentStepIndex,
      ord: nextOrd++,
      type: "stage_started",
      status: "running",
      title: `${stage.label} started`,
      summary: `Started ${stage.label} with ${agent.name}.`,
      detail: null,
      payload: {
        applicationId: application.id,
        applicationName: application.name,
        runtimeId: runtime?.id ?? null,
        runtimeName: runtime?.name ?? null,
        stageLabel: stage.label,
        agentId: agent.id,
        agentName: agent.name
      }
    }));

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: currentRun.currentStepIndex,
      ord: nextOrd++,
      type: "agent_input",
      status: "completed",
      title: `${agent.name} received stage context`,
      summary: `Received ${stage.label} context for ${application.name} at ${target.baseUrl}.`,
      detail: runtime
        ? `Runtime context: ${runtime.name} (${runtime.provider}, ${runtime.region}).`
        : null,
      payload: {
        stageLabel: stage.label,
        targetUrl: target.baseUrl,
        targetHost: target.host,
        targetPort: target.port ?? null,
        runtime: runtime
          ? {
              id: runtime.id,
              name: runtime.name,
              provider: runtime.provider,
              region: runtime.region
            }
          : null,
        allowedToolIds: tools.map((tool) => tool.id)
      }
    }));

    const selectionStartedAt = Date.now();
    const result = await this.evaluator.evaluate({
      roleName: agent.name,
      systemPrompt: agent.systemPrompt,
      scenarioPrompt: [
        `Workflow stage: ${stage.label}`,
        `Target application: ${application.name}`,
        `Target URL: ${target.baseUrl}`,
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
    const selectionDurationMs = Date.now() - selectionStartedAt;

    const selectedTools = result.parsed.selectedToolIds
      .map((toolId) => tools.find((tool) => tool.id === toolId))
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: currentRun.currentStepIndex,
      ord: nextOrd++,
      type: "model_decision",
      status: "completed",
      title: `${agent.name} selected tools`,
      summary: `Selected ${selectedTools.map((tool) => tool.name).join(", ")}.`,
      detail: result.parsed.reason,
      payload: {
        selectedToolIds: result.parsed.selectedToolIds,
        selectedToolNames: selectedTools.map((tool) => tool.name),
        rawModelOutput: result.rawContent,
        reasoning: result.parsed.reason,
        durationMs: selectionDurationMs
      }
    }));

    const executedResults: ExecutedToolResult[] = [];

    for (const tool of selectedTools) {
      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "tool_call",
        status: "running",
        title: `${tool.name} invoked`,
        summary: `Calling ${tool.name} for ${target.host}${target.port ? `:${target.port}` : ""}.`,
        detail: tool.description ?? null,
        payload: {
          toolId: tool.id,
          toolName: tool.name,
          scriptPath: tool.scriptPath ?? null,
          capabilities: tool.capabilities,
          executionMode: tool.executionMode,
          target: target.host,
          port: target.port ?? null,
          configuredTimeoutMs: tool.timeoutMs ?? null
        }
      }));

      const executed = await this.executeToolForWorkflow({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        agentId: agent.id,
        scan,
        target,
        tool,
        justification: result.parsed.reason
      });
      executedResults.push(executed);

      if (executed.mode === "executed") {
        currentRun = await this.appendEvent(currentRun, this.createEvent({
          run: currentRun,
          workflowId: workflow.id,
          stageId: stage.id,
          stepIndex: currentRun.currentStepIndex,
          ord: nextOrd++,
          type: "tool_result",
          status: executed.toolRun.status === "completed" ? "completed" : "failed",
          title: `${tool.name} returned ${executed.toolRun.status}`,
          summary: truncate(executed.outputPreview || `${tool.name} completed without output.`),
          detail: executed.fullOutput || null,
          payload: {
            toolId: tool.id,
            toolName: tool.name,
            toolRun: executed.toolRun,
            toolRequest: executed.toolRequest,
            observationSummaries: executed.observationSummaries,
            findingSummaries: executed.findingSummaries,
            outputPreview: executed.outputPreview,
            fullOutput: executed.fullOutput,
            durationMs: executed.durationMs,
            configuredTimeoutMs: executed.configuredTimeoutMs,
            timedOut: executed.timedOut
          }
        }));
      } else {
        currentRun = await this.appendEvent(currentRun, this.createEvent({
          run: currentRun,
          workflowId: workflow.id,
          stageId: stage.id,
          stepIndex: currentRun.currentStepIndex,
          ord: nextOrd++,
          type: "tool_result",
          status: "completed",
          title: `${tool.name} resolved in-agent`,
          summary: executed.outputPreview,
          detail: executed.fullOutput,
          payload: {
            toolId: tool.id,
            toolName: tool.name,
            mode: executed.mode,
            summary: executed.toolSummary,
            outputPreview: executed.outputPreview,
            fullOutput: executed.fullOutput,
            durationMs: executed.durationMs
          }
        }));
      }
    }

    const failedResults = executedResults.filter((item): item is Extract<ExecutedToolResult, { mode: "executed" }> =>
      isExecutedToolResult(item) && item.toolRun.status !== "completed"
    );
    const failedResult = failedResults.find((item) => !item.timedOut) ?? failedResults[0];
    const observationCount = executedResults.reduce((total, item) => {
      return total + (isExecutedToolResult(item) ? item.observationSummaries.length : 0);
    }, 0);
    const findingCount = executedResults.reduce((total, item) => {
      return total + (isExecutedToolResult(item) ? item.findingSummaries.length : 0);
    }, 0);

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: currentRun.currentStepIndex,
      ord: nextOrd++,
      type: "agent_summary",
      status: failedResult ? "failed" : "completed",
      title: `${agent.name} summarized the stage`,
      summary: failedResult
        ? `Stage encountered a failed tool result after ${selectedTools.length} tool selection(s).`
        : `Executed ${selectedTools.length} tool selection(s), producing ${observationCount} observation(s) and ${findingCount} finding summary item(s).`,
      detail: failedResult
        ? `The failing tool was ${failedResult.toolRun.tool}: ${failedResult.toolRun.statusReason ?? "unknown error"}.`
        : `Selected tools: ${selectedTools.map((tool) => tool.name).join(", ")}.`,
      payload: {
        selectedToolIds: selectedTools.map((tool) => tool.id),
        observationCount,
        findingCount,
        failedToolRunId: failedResult?.toolRun.id ?? null,
        timedOutToolRunIds: executedResults
          .filter((item): item is Extract<ExecutedToolResult, { mode: "executed" }> => isExecutedToolResult(item) && item.timedOut)
          .map((item) => item.toolRun.id)
      }
    }));

    const nextStepIndex = run.currentStepIndex + 1;
    const nextRunStatus: WorkflowRun["status"] = nextStepIndex >= orderedStages.length ? "completed" : "running";
    const finalPatch = failedResult && !failedResult.timedOut
      ? {
          status: "failed" as const,
          currentStepIndex: run.currentStepIndex,
          completedAt: new Date().toISOString()
        }
      : {
          status: nextRunStatus,
          currentStepIndex: nextStepIndex,
          completedAt: nextRunStatus === "completed" ? new Date().toISOString() : null
        };

    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: failedResult && !failedResult.timedOut ? "stage_failed" : "stage_completed",
        status: failedResult && !failedResult.timedOut ? "failed" : "completed",
        title: failedResult && !failedResult.timedOut ? `${stage.label} failed` : `${stage.label} completed`,
        summary: failedResult && !failedResult.timedOut
          ? `${stage.label} failed because ${failedResult.toolRun.tool} did not complete successfully.`
          : failedResult?.timedOut
            ? `${stage.label} completed with degraded evidence after a tool timeout.`
            : `${stage.label} completed and is ready to hand off.`,
        detail: failedResult?.toolRun.statusReason ?? null,
        payload: {
          stageLabel: stage.label,
          selectedToolIds: selectedTools.map((tool) => tool.id),
          failedToolRunId: failedResult?.toolRun.id ?? null,
          degraded: Boolean(failedResult?.timedOut)
        }
      }),
      finalPatch
    );

    const traceEntry: WorkflowTraceEntry = {
      id: randomUUID(),
      workflowRunId: run.id,
      workflowId: workflow.id,
      workflowStageId: stage.id,
      stepIndex: run.currentStepIndex,
      stageLabel: stage.label,
      agentId: agent.id,
      agentName: agent.name,
      status: failedResult && !failedResult.timedOut ? "failed" : "completed",
      selectedToolIds: selectedTools.map((tool) => tool.id),
      toolSelectionReason: result.parsed.reason,
      targetSummary: runtime
        ? `${application.name} at ${target.baseUrl} via ${runtime.name}`
        : `${application.name} at ${target.baseUrl}`,
      evidenceHighlights: [
        `Executed tools: ${selectedTools.map((tool) => tool.name).join(", ")}.`,
        `Observations: ${observationCount}. Findings: ${findingCount}.`,
        ...(executedResults.some((item) => isExecutedToolResult(item) && item.timedOut)
          ? ["One or more tool executions timed out and the stage completed with degraded evidence."]
          : [])
      ],
      outputSummary: result.rawContent,
      createdAt: new Date().toISOString()
    };

    currentRun = await this.appendTraceEntry(currentRun, traceEntry);
    return currentRun;
  }

  private createEvent(input: {
    run: WorkflowRun;
    workflowId: string;
    stageId: string | null;
    stepIndex: number;
    ord: number;
    type: WorkflowTraceEvent["type"];
    status: WorkflowTraceEvent["status"];
    title: string;
    summary: string;
    detail?: string | null;
    payload: Record<string, unknown>;
    createdAt?: string;
  }): WorkflowTraceEvent {
    return {
      id: randomUUID(),
      workflowRunId: input.run.id,
      workflowId: input.workflowId,
      workflowStageId: input.stageId,
      stepIndex: input.stepIndex,
      ord: input.ord,
      type: input.type,
      status: input.status,
      title: input.title,
      summary: input.summary,
      detail: input.detail ?? null,
      payload: input.payload,
      createdAt: input.createdAt ?? new Date().toISOString()
    };
  }

  private async ensureWorkflowScan(run: WorkflowRun, target: { host: string }) {
    const existing = await getScan(run.id);
    if (existing) {
      return existing;
    }

    const scan = createWorkflowScan(run, target);
    await createScan(scan);
    return scan;
  }

  private async appendEvent(run: WorkflowRun, event: WorkflowTraceEvent, patch?: {
    status?: WorkflowRun["status"];
    currentStepIndex?: number;
    completedAt?: string | null;
  }) {
    const updatedRun = await this.workflowsRepository.appendRunEvent(run.id, event, patch);
    this.workflowRunStream.publish(updatedRun.id, {
      type: "event_appended",
      run: updatedRun,
      event
    });
    return updatedRun;
  }

  private async appendTraceEntry(run: WorkflowRun, traceEntry: WorkflowTraceEntry) {
    const updatedRun = await this.workflowsRepository.appendTraceEntry(run.id, traceEntry);
    this.workflowRunStream.publish(updatedRun.id, {
      type: "trace_appended",
      run: updatedRun,
      traceEntry
    });
    return updatedRun;
  }

  private publishSnapshot(run: WorkflowRun) {
    this.workflowRunStream.publish(run.id, {
      type: "snapshot",
      run
    });
  }

  private async executeToolForWorkflow(input: {
    run: WorkflowRun;
    workflowId: string;
    stageId: string;
    stepIndex: number;
    agentId: string;
    scan: Scan;
    target: { baseUrl: string; host: string; port?: number };
    tool: NonNullable<Awaited<ReturnType<AiToolsRepository["getById"]>>>;
    justification: string;
  }): Promise<ExecutedToolResult> {
    const { tool, target } = input;

    if (tool.executionMode === "sandboxed" && tool.binary) {
      const startedAt = Date.now();
      const request = compileToolRequestFromDefinition(tool, {
        target: target.host,
        ...(target.port == null ? {} : { port: target.port }),
        layer: inferLayer(tool.category),
        justification: input.justification
      });

      const brokerResult = await this.broker.executeRequests({
        scan: input.scan,
        tacticId: input.stageId,
        agentId: input.agentId,
        requests: [request]
      });
      const toolRun = brokerResult.toolRuns[0];
      if (!toolRun) {
        throw new Error(`Workflow tool execution did not create a tool run for ${tool.name}.`);
      }

      return {
        mode: "executed",
        toolRequest: request,
        toolRun,
        observationSummaries: brokerResult.observations.map((observation) => observation.summary),
        findingSummaries: brokerResult.findings.map((finding) => finding.title),
        outputPreview: truncate(toolRun.output ?? toolRun.statusReason ?? `${tool.name} completed.`),
        fullOutput: toolRun.output ?? toolRun.statusReason ?? "",
        durationMs: Date.now() - startedAt,
        configuredTimeoutMs: typeof request.parameters["timeoutMs"] === "number" ? request.parameters["timeoutMs"] : null,
        timedOut: (toolRun.statusReason ?? "").toLowerCase().includes("timed out")
      };
    }

    const startedAt = Date.now();
    const virtualSummary = tool.id === "seed-evidence-review"
      ? "Reviewed gathered evidence from earlier tool outputs and highlighted confidence gaps."
      : tool.id === "seed-report-writer"
        ? "Prepared a draft report structure from the currently available findings and evidence."
        : `${tool.name} was resolved as an in-agent utility step.`;

    return {
      mode: "virtual",
      toolSummary: virtualSummary,
      outputPreview: truncate(virtualSummary),
      fullOutput: virtualSummary,
      durationMs: Date.now() - startedAt
    };
  }
}
