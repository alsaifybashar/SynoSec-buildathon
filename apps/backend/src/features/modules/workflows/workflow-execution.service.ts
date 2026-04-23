import { randomUUID } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type LanguageModel } from "ai";
import type {
  AiTool,
  OsiLayer,
  Scan,
  ToolRequest,
  ToolRun,
  Workflow,
  WorkflowReportedFinding,
  WorkflowRun,
  WorkflowStage,
  WorkflowStageResult,
  WorkflowTraceEntry,
  WorkflowTraceEvent
} from "@synosec/contracts";
import {
  workflowFindingSubmissionSchema,
  workflowStageResultSubmissionSchema
} from "@synosec/contracts";
import { RequestError } from "../../../core/http/request-error.js";
import { createScan, getScan } from "../../../platform/db/scan-store.js";
import { ToolBroker } from "../../../workflow-engine/broker/tool-broker.js";
import { compileToolRequestFromDefinition } from "../ai-tools/tool-definition.compiler.js";
import type { AiAgentsRepository } from "../ai-agents/ai-agents.repository.js";
import type { AiProvidersRepository, StoredAiProvider } from "../ai-providers/ai-providers.repository.js";
import type { AiToolsRepository } from "../ai-tools/ai-tools.repository.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import { SingleAgentScanService } from "../scans/single-agent-scan.service.js";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";
import type { WorkflowRunStream } from "./workflow-run-stream.js";
import {
  createToolSelectionSummary,
  inferLayer,
  normalizeToolInput,
  parseExecutionTarget,
  parseTarget,
  truncate
} from "./workflow-execution.utils.js";
import type { WorkflowsRepository } from "./workflows.repository.js";

const workflowFindingToolInputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "title", "severity", "confidence", "target", "evidence", "impact", "recommendation"],
  properties: {
    type: {
      type: "string",
      enum: [
        "service_exposure",
        "content_discovery",
        "missing_security_header",
        "tls_weakness",
        "injection_signal",
        "auth_weakness",
        "sensitive_data_exposure",
        "misconfiguration",
        "other"
      ]
    },
    title: { type: "string" },
    severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    target: {
      type: "object",
      required: ["host"],
      properties: {
        host: { type: "string" },
        port: { type: "number" },
        url: { type: "string" },
        path: { type: "string" }
      }
    },
    evidence: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["sourceTool", "quote"],
        properties: {
          sourceTool: { type: "string" },
          quote: { type: "string" },
          artifactRef: { type: "string" }
        }
      }
    },
    impact: { type: "string" },
    recommendation: { type: "string" },
    cwe: { type: "string" },
    owasp: { type: "string" },
    reproduction: {
      type: "object",
      required: ["steps"],
      properties: {
        commandPreview: { type: "string" },
        steps: {
          type: "array",
          minItems: 1,
          items: { type: "string" }
        }
      }
    },
    tags: {
      type: "array",
      items: { type: "string" }
    }
  }
};

const workflowStageResultToolInputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "summary", "recommendedNextStep", "residualRisk"],
  properties: {
    status: {
      type: "string",
      enum: ["completed", "blocked", "insufficient_evidence"]
    },
    summary: { type: "string" },
    findingIds: {
      type: "array",
      items: { type: "string" }
    },
    recommendedNextStep: { type: "string" },
    residualRisk: { type: "string" },
    handoff: {
      anyOf: [
        {
          type: "object"
        },
        {
          type: "null"
        }
      ]
    }
  }
};

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

type ExecutedToolResult = {
  mode: "executed";
  toolId: string;
  toolName: string;
  toolInput: Record<string, string | number | boolean | string[]>;
  toolRequest: ToolRequest;
  toolRun: ToolRun;
  observationSummaries: string[];
  findingSummaries: string[];
  outputPreview: string;
  fullOutput: string;
  durationMs: number;
  configuredTimeoutMs: number | null;
  timedOut: boolean;
};

type DegradedTool = {
  toolId: string;
  toolName: string;
  reason: string;
};

type ToolLoopResult = {
  selectedToolIds: string[];
  selectedToolNames: string[];
  assistantText: string;
  rawModelOutput: string;
  executedResults: ExecutedToolResult[];
  degradedTools: DegradedTool[];
  reportedFindings: WorkflowReportedFinding[];
  stageResult: WorkflowStageResult | null;
  validationError: string | null;
};

type ToolLoopContext = {
  run: WorkflowRun;
  agent: NonNullable<Awaited<ReturnType<AiAgentsRepository["getById"]>>>;
  provider: StoredAiProvider;
  stage: WorkflowStage;
  application: NonNullable<Awaited<ReturnType<ApplicationsRepository["getById"]>>>;
  runtime: Awaited<ReturnType<RuntimesRepository["getById"]>>;
  target: { baseUrl: string; host: string; port?: number };
  scan: Scan;
  tools: AiTool[];
};

type SharedToolLoopState = {
  executableTools: AiTool[];
  degradedTools: DegradedTool[];
  executedResults: ExecutedToolResult[];
  reportedFindings: WorkflowReportedFinding[];
  stageResult: WorkflowStageResult | null;
};

function summarizeDegradedTools(degradedTools: DegradedTool[]) {
  return degradedTools.map((candidate) => `${candidate.toolName}: ${candidate.reason}`).join(" ");
}

type LocalWorkflowModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SINGLE_AGENT_WORKFLOW_NAME = "OSI Single-Agent";
const SINGLE_AGENT_WORKFLOW_LAYERS: OsiLayer[] = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];

export class WorkflowExecutionService {
  private readonly broker: ToolBroker;

  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly runtimesRepository: RuntimesRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    private readonly aiProvidersRepository: AiProvidersRepository,
    private readonly aiToolsRepository: AiToolsRepository,
    private readonly workflowRunStream: WorkflowRunStream,
    private readonly singleAgentScanService: SingleAgentScanService
  ) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
  }

  async startRun(workflowId: string) {
    const workflow = await this.loadWorkflowForExecution(workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }
    if (workflow.stages.length === 0) {
      throw new RequestError(400, "Workflow has no stages.");
    }

    const orderedStages = workflow.stages.slice().sort((left, right) => left.ord - right.ord);
    const firstAgent = await this.aiAgentsRepository.getById(orderedStages[0]?.agentId ?? "");
    if (!firstAgent) {
      throw new RequestError(400, "Workflow stage agent not found.");
    }

    const firstProvider = await this.aiProvidersRepository.getStoredById(firstAgent.providerId);
    this.assertProviderSupportsWorkflowExecution(firstProvider);

    const run = await this.workflowsRepository.createRun(workflowId);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    this.publishSnapshot(run);
    if (this.isSingleAgentWorkflow(workflow)) {
      void this.executeSingleAgentWorkflowRun(workflow, run).catch(async (error) => {
        await this.failWorkflowRunAfterUnhandledError(run.id, error);
      });
    }
    return run;
  }

  private async failWorkflowRunAfterUnhandledError(runId: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);

    try {
      const failedRun = await this.workflowsRepository.updateRunState(runId, {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      this.publishSnapshot(failedRun);
    } catch (updateError) {
      console.error("Failed to persist workflow run failure state.", updateError);
    }

    console.error("Unhandled single-agent workflow execution failure.", detail);
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

    const workflow = await this.loadWorkflowForExecution(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    if (this.isSingleAgentWorkflow(workflow)) {
      throw new RequestError(400, "OSI Single-Agent runs advance automatically after start.");
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

    const provider = await this.aiProvidersRepository.getStoredById(agent.providerId);
    this.assertProviderSupportsWorkflowExecution(provider);

    const target = parseTarget(application.baseUrl);
    const scan = await this.ensureWorkflowScan(run, target);
    const tools = (
      await Promise.all(stage.allowedToolIds.map((toolId) => this.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

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
      detail: stage.objective,
      payload: {
        applicationId: application.id,
        applicationName: application.name,
        runtimeId: runtime?.id ?? null,
        runtimeName: runtime?.name ?? null,
        stageLabel: stage.label,
        stageObjective: stage.objective,
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
        stageObjective: stage.objective,
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
        allowedToolIds: stage.allowedToolIds,
        requiredEvidenceTypes: stage.requiredEvidenceTypes,
        completionRule: stage.completionRule
      }
    }));

    const selectionStartedAt = Date.now();
    let toolLoopResult: ToolLoopResult;

    try {
      toolLoopResult = await this.runToolLoopForStage({
        run: currentRun,
        agent,
        provider,
        stage,
        application,
        runtime,
        target,
        scan,
        tools
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "model_decision",
        status: "failed",
        title: `${agent.name} could not start tool calling`,
        summary: "Native AI SDK tool calling failed before any tool execution.",
        detail: reason,
        payload: {
          selectedToolIds: [],
          selectedToolNames: [],
          rawModelOutput: "",
          reasoning: reason,
          durationMs: Date.now() - selectionStartedAt
        }
      }), {
        status: "failed",
        currentStepIndex: run.currentStepIndex,
        completedAt: new Date().toISOString()
      });

      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "stage_failed",
        status: "failed",
        title: `${stage.label} failed`,
        summary: `${stage.label} failed because the structured JSON action loop could not start.`,
        detail: reason,
        payload: {
          stageLabel: stage.label,
          selectedToolIds: [],
          failedToolRunId: null,
          degraded: false
        }
      }));

      return currentRun;
    }

    const selectionDurationMs = Date.now() - selectionStartedAt;
    const failedToolResults = toolLoopResult.executedResults.filter((item) => item.toolRun.status !== "completed");
    const observationCount = toolLoopResult.executedResults.reduce((total, item) => total + item.observationSummaries.length, 0);
    const findingCount = toolLoopResult.reportedFindings.length;
    const stageDegraded = toolLoopResult.degradedTools.length > 0 || failedToolResults.length > 0;
    const stageFailed = Boolean(toolLoopResult.validationError);

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: currentRun.currentStepIndex,
      ord: nextOrd++,
      type: "model_decision",
      status: stageFailed ? "failed" : "completed",
      title: `${agent.name} completed stage reasoning`,
      summary: createToolSelectionSummary(toolLoopResult.selectedToolNames),
      detail: (toolLoopResult.stageResult?.summary ?? toolLoopResult.assistantText) || null,
      payload: {
        selectedToolIds: toolLoopResult.selectedToolIds,
        selectedToolNames: toolLoopResult.selectedToolNames,
        rawModelOutput: toolLoopResult.rawModelOutput,
        reasoning: toolLoopResult.assistantText,
        durationMs: selectionDurationMs,
        degradedTools: toolLoopResult.degradedTools,
        reportedFindingIds: toolLoopResult.reportedFindings.map((finding) => finding.id),
        submittedStageResult: toolLoopResult.stageResult,
        validationError: toolLoopResult.validationError
      }
    }));

    for (const executed of toolLoopResult.executedResults) {
      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "tool_call",
        status: "running",
        title: `${executed.toolName} invoked`,
        summary: `Calling ${executed.toolName} for ${executed.toolRequest.target}${executed.toolRequest.port ? `:${executed.toolRequest.port}` : ""}.`,
        detail: JSON.stringify(executed.toolInput),
        payload: {
          toolId: executed.toolId,
          toolName: executed.toolName,
          toolInput: executed.toolInput,
          executorType: executed.toolRequest.executorType,
          capabilities: executed.toolRequest.capabilities,
          target: executed.toolRequest.target,
          port: executed.toolRequest.port ?? null,
          configuredTimeoutMs: executed.configuredTimeoutMs
        }
      }));

      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "tool_result",
        status: executed.toolRun.status === "completed" ? "completed" : "failed",
        title: `${executed.toolName} returned ${executed.toolRun.status}`,
        summary: truncate(executed.outputPreview || `${executed.toolName} completed without output.`),
        detail: executed.fullOutput || null,
        payload: {
          toolId: executed.toolId,
          toolName: executed.toolName,
          toolInput: executed.toolInput,
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
    }

    for (const finding of toolLoopResult.reportedFindings) {
      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "finding_reported",
        status: "completed",
        title: `Finding reported: ${finding.title}`,
        summary: `${finding.severity.toUpperCase()} ${finding.type} on ${finding.target.host}.`,
        detail: finding.impact,
        payload: {
          finding
        }
      }));
    }

    if (toolLoopResult.stageResult) {
      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "stage_result_submitted",
        status: stageFailed ? "failed" : "completed",
        title: `${stage.label} submitted structured result`,
        summary: toolLoopResult.stageResult.summary,
        detail: toolLoopResult.stageResult.residualRisk,
        payload: {
          result: toolLoopResult.stageResult,
          reportedFindingIds: toolLoopResult.stageResult.findingIds
        }
      }));
    }

    if (toolLoopResult.validationError) {
      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: currentRun.currentStepIndex,
        ord: nextOrd++,
        type: "stage_contract_validation_failed",
        status: "failed",
        title: `${stage.label} violated its stage contract`,
        summary: toolLoopResult.validationError,
        detail: toolLoopResult.rawModelOutput || null,
        payload: {
          stageLabel: stage.label,
          completionRule: stage.completionRule,
          requiredEvidenceTypes: stage.requiredEvidenceTypes,
          reportedFindingIds: toolLoopResult.reportedFindings.map((finding) => finding.id),
          submittedStageResult: toolLoopResult.stageResult
        }
      }));
    }

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: currentRun.currentStepIndex,
      ord: nextOrd++,
      type: "agent_summary",
      status: stageFailed ? "failed" : "completed",
      title: `${agent.name} summarized the stage`,
      summary: stageFailed
        ? `Stage failed contract validation after ${toolLoopResult.selectedToolIds.length} structured tool call(s).`
        : `Submitted structured stage result with ${findingCount} finding(s) after ${toolLoopResult.selectedToolIds.length} structured tool call(s).`,
      detail: stageFailed
        ? toolLoopResult.validationError
        : stageDegraded
          ? `Stage completed with degraded evidence. ${summarizeDegradedTools(toolLoopResult.degradedTools)}`
          : (toolLoopResult.stageResult?.recommendedNextStep ?? `Selected tools: ${toolLoopResult.selectedToolNames.join(", ") || "none"}.`),
      payload: {
        selectedToolIds: toolLoopResult.selectedToolIds,
        observationCount,
        findingCount,
        reportedFindingIds: toolLoopResult.reportedFindings.map((finding) => finding.id),
        timedOutToolRunIds: toolLoopResult.executedResults.filter((item) => item.timedOut).map((item) => item.toolRun.id),
        degradedTools: toolLoopResult.degradedTools,
        validationError: toolLoopResult.validationError,
        stageResult: toolLoopResult.stageResult
      }
    }));

    const nextStepIndex = run.currentStepIndex + 1;
    const nextRunStatus: WorkflowRun["status"] = nextStepIndex >= orderedStages.length ? "completed" : "running";
    const finalPatch = stageFailed
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
        type: stageFailed ? "stage_failed" : "stage_completed",
        status: stageFailed ? "failed" : "completed",
        title: stageFailed ? `${stage.label} failed` : `${stage.label} completed`,
        summary: stageFailed
          ? `${stage.label} failed because it did not satisfy the stage contract.`
          : stageDegraded
            ? `${stage.label} completed with degraded evidence.`
            : `${stage.label} completed and is ready to hand off.`,
        detail: toolLoopResult.validationError,
        payload: {
          stageLabel: stage.label,
          selectedToolIds: toolLoopResult.selectedToolIds,
          degraded: stageDegraded,
          reportedFindingIds: toolLoopResult.reportedFindings.map((finding) => finding.id)
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
      status: stageFailed ? "failed" : "completed",
      selectedToolIds: toolLoopResult.selectedToolIds,
      toolSelectionReason: (toolLoopResult.stageResult?.summary ?? toolLoopResult.assistantText) || "Structured stage execution completed.",
      targetSummary: runtime
        ? `${application.name} at ${target.baseUrl} via ${runtime.name}`
        : `${application.name} at ${target.baseUrl}`,
      evidenceHighlights: [
        `Executed tools: ${toolLoopResult.selectedToolNames.join(", ") || "none"}.`,
        `Structured findings: ${findingCount}. Observations: ${observationCount}.`,
        ...toolLoopResult.reportedFindings.slice(0, 2).map((finding) => `${finding.severity.toUpperCase()}: ${finding.title}`),
        ...(stageDegraded ? ["Stage completed with degraded evidence because at least one tool was skipped or failed."] : []),
        ...(stageFailed ? [toolLoopResult.validationError ?? "Stage contract validation failed."] : [])
      ],
      outputSummary: (toolLoopResult.stageResult?.summary ?? toolLoopResult.rawModelOutput) || "No model output recorded.",
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

  private isSingleAgentWorkflow(workflow: Workflow) {
    return workflow.name === SINGLE_AGENT_WORKFLOW_NAME;
  }

  private buildSingleAgentScope(baseUrl: string) {
    return {
      targets: [baseUrl],
      exclusions: [],
      layers: SINGLE_AGENT_WORKFLOW_LAYERS,
      maxDepth: 8,
      maxDurationMinutes: 20,
      rateLimitRps: 5,
      allowActiveExploits: false,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "simulation" as const
    };
  }

  private async executeSingleAgentWorkflowRun(workflow: Workflow, run: WorkflowRun) {
    const stage = workflow.stages.slice().sort((left, right) => left.ord - right.ord)[0];
    if (!stage) {
      const failedRun = await this.workflowsRepository.updateRunState(run.id, {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      this.publishSnapshot(failedRun);
      return;
    }

    const [agent, application, runtime] = await Promise.all([
      this.aiAgentsRepository.getById(stage.agentId),
      this.applicationsRepository.getById(workflow.applicationId),
      workflow.runtimeId ? this.runtimesRepository.getById(workflow.runtimeId) : Promise.resolve(null)
    ]);

    if (!agent || !application) {
      const failedRun = await this.workflowsRepository.updateRunState(run.id, {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      this.publishSnapshot(failedRun);
      return;
    }

    let currentRun = run;
    let nextOrd = currentRun.events.length;

    currentRun = await this.appendEvent(currentRun, this.createEvent({
      run: currentRun,
      workflowId: workflow.id,
      stageId: stage.id,
      stepIndex: 0,
      ord: nextOrd++,
      type: "stage_started",
      status: "running",
      title: `${stage.label} started`,
      summary: `Started ${stage.label} with ${agent.name}.`,
      detail: stage.objective,
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

    const selectedToolIds = stage.allowedToolIds.length > 0 ? stage.allowedToolIds : agent.toolIds;

    try {
      await this.singleAgentScanService.runWorkflowLinkedScan({
        runId: currentRun.id,
        applicationId: application.id,
        runtimeId: runtime?.id ?? null,
        agentId: agent.id,
        scope: this.buildSingleAgentScope(application.baseUrl ?? "http://localhost:8888"),
        onWorkflowModelOutput: async (output) => {
          this.publishModelOutput(currentRun, {
            source: output.source,
            text: output.text,
            final: output.final ?? false,
            createdAt: output.createdAt ?? new Date().toISOString()
          });
        },
        onWorkflowEvent: async (event) => {
          const workflowEvent = this.createEvent({
            run: currentRun,
            workflowId: workflow.id,
            stageId: stage.id,
            stepIndex: 0,
            ord: nextOrd++,
            type: event.type,
            status: event.status ?? "completed",
            title: event.title,
            summary: event.summary,
            detail: event.detail ?? null,
            payload: {
              agentId: agent.id,
              agentName: agent.name,
              ...(event.payload ?? {})
            },
            ...(event.createdAt ? { createdAt: event.createdAt } : {})
          });
          currentRun = await this.appendEvent(currentRun, workflowEvent);
        }
      });

      currentRun = await this.appendTraceEntry(currentRun, {
        id: randomUUID(),
        workflowRunId: currentRun.id,
        workflowId: workflow.id,
        workflowStageId: stage.id,
        stepIndex: 0,
        stageLabel: stage.label,
        agentId: agent.id,
        agentName: agent.name,
        status: "completed",
        selectedToolIds,
        toolSelectionReason: "Single-agent workflow uses the preconfigured agent prompt, approved tool list, and OSI scan defaults for one continuous run.",
        targetSummary: runtime
          ? `${application.name} at ${application.baseUrl} via ${runtime.name}`
          : `${application.name} at ${application.baseUrl}`,
        evidenceHighlights: [
          "Live evidence is persisted into scan artifacts during the run.",
          "Workflow events stream progress while the single-agent loop executes."
        ],
        outputSummary: "Single-agent workflow run completed and persisted its latest evidence-backed report.",
        createdAt: new Date().toISOString()
      });

      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: 0,
        ord: nextOrd++,
        type: "stage_completed",
        status: "completed",
        title: `${stage.label} completed`,
        summary: "The single-agent workflow finished and persisted its latest report artifacts.",
        detail: "Reload the report panels to inspect the final vulnerability, coverage, and audit outputs.",
        payload: {
          applicationId: application.id,
          agentId: agent.id
        }
      }), {
        status: "completed",
        currentStepIndex: 1,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      currentRun = await this.appendEvent(currentRun, this.createEvent({
        run: currentRun,
        workflowId: workflow.id,
        stageId: stage.id,
        stepIndex: 0,
        ord: nextOrd++,
        type: "stage_failed",
        status: "failed",
        title: `${stage.label} failed`,
        summary: "The single-agent workflow stopped before finishing.",
        detail,
        payload: {
          applicationId: application.id,
          agentId: agent.id
        }
      }), {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      this.publishSnapshot(currentRun);
    }
  }

  private mapSingleAgentAuditToWorkflowEvent(input: {
    action: string;
    details: Record<string, unknown>;
    run: WorkflowRun;
    workflow: Workflow;
    stage: WorkflowStage;
    ord: number;
    agent: { id: string; name: string };
    timestamp: string;
  }) {
    const base = {
      run: input.run,
      workflowId: input.workflow.id,
      stageId: input.stage.id,
      stepIndex: 0,
      ord: input.ord,
      createdAt: input.timestamp
    };

    switch (input.action) {
      case "single-agent-scan-started":
        return this.createEvent({
          ...base,
          type: "agent_input",
          status: "running",
          title: "Single-agent run bootstrapped",
          summary: "Initialized the OSI single-agent loop with the preconfigured scope and approved tools.",
          detail: null,
          payload: input.details
        });
      case "single-agent-tool-requested":
        return this.createEvent({
          ...base,
          type: "tool_call",
          status: "running",
          title: `Tool requested: ${String(input.details["toolName"] ?? input.details["toolId"] ?? "tool")}`,
          summary: "The agent selected a tool for evidence collection.",
          detail: null,
          payload: input.details
        });
      case "single-agent-vulnerability-reported":
        return this.createEvent({
          ...base,
          type: "finding_reported",
          status: "completed",
          title: `Vulnerability reported: ${String(input.details["title"] ?? "finding")}`,
          summary: "The agent persisted one evidence-backed vulnerability.",
          detail: null,
          payload: input.details
        });
      case "single-agent-layer-coverage-updated":
        if (
          input.details["coverageStatus"] === "not_covered"
          && (!Array.isArray(input.details["toolRefs"]) || input.details["toolRefs"].length === 0)
          && (!Array.isArray(input.details["evidenceRefs"]) || input.details["evidenceRefs"].length === 0)
          && (!Array.isArray(input.details["vulnerabilityIds"]) || input.details["vulnerabilityIds"].length === 0)
        ) {
          return null;
        }
        return this.createEvent({
          ...base,
          type: "tool_result",
          status: "completed",
          title: `Layer coverage updated: ${String(input.details["layer"] ?? "unknown")}`,
          summary: "The agent updated per-layer coverage from the latest evidence state.",
          detail: null,
          payload: input.details
        });
      case "single-agent-scan-closeout-submitted":
        return this.createEvent({
          ...base,
          type: "agent_summary",
          status: "completed",
          title: "Single-agent closeout submitted",
          summary: "The agent submitted the final structured closeout.",
          detail: String(input.details["summary"] ?? ""),
          payload: input.details
        });
      default:
        return null;
    }
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

  private publishModelOutput(run: WorkflowRun, output: {
    source: "local" | "hosted";
    text: string;
    final: boolean;
    createdAt: string;
  }) {
    this.workflowRunStream.publish(run.id, {
      type: "model_output",
      run,
      source: output.source,
      text: output.text,
      final: output.final,
      createdAt: output.createdAt
    });
  }

  private assertProviderSupportsWorkflowExecution(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Workflow stage provider not found.");
    }

    if (provider.kind === "anthropic" && !provider.apiKey) {
      throw new RequestError(400, "Workflow runs require an Anthropic API key when the selected agent uses an Anthropic provider.");
    }

    if (provider.kind === "local" && !provider.baseUrl) {
      throw new RequestError(400, "Workflow runs require a base URL when the selected agent uses a local provider.");
    }
  }

  private createAnthropicLanguageModel(provider: StoredAiProvider, model: string): LanguageModel {
    const anthropic = createAnthropic({
      ...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {})
    });

    return anthropic(model);
  }

  private async loadWorkflowForExecution(workflowId: string): Promise<Workflow | null> {
    const workflow = await this.workflowsRepository.getById(workflowId);
    if (!workflow) {
      return null;
    }

    const uniqueAgentIds = [...new Set(workflow.stages.map((stage) => stage.agentId))];
    const agents = await Promise.all(uniqueAgentIds.map(async (agentId) => [agentId, await this.aiAgentsRepository.getById(agentId)] as const));
    const fallbackToolIdsByAgentId = Object.fromEntries(
      agents.map(([agentId, agent]) => [agentId, agent?.toolIds ?? []])
    );

    const migratedWorkflow = await this.workflowsRepository.migrateWorkflowStageContracts(workflowId, fallbackToolIdsByAgentId);
    if (!migratedWorkflow) {
      throw new RequestError(500, `Workflow ${workflowId} could not be loaded after stage contract migration.`, {
        code: "WORKFLOW_MIGRATION_FAILED",
        userFriendlyMessage: "The workflow could not be prepared for execution."
      });
    }

    return migratedWorkflow;
  }

  private validateStageContractOutcome(stage: WorkflowStage, result: Pick<ToolLoopResult, "selectedToolIds" | "reportedFindings" | "stageResult">) {
    const normalizedStage = {
      ...stage,
      ...normalizeWorkflowStageContract(stage, stage.allowedToolIds)
    };
    const findingIds = new Set(result.reportedFindings.map((finding) => finding.id));
    const availableEvidenceTypes = new Set(
      result.reportedFindings.flatMap((finding) => [finding.type, ...finding.tags])
    );

    if (normalizedStage.completionRule.requireStageResult && !result.stageResult) {
      return "Stage did not submit a structured stage result.";
    }

    if (normalizedStage.completionRule.requireToolCall && result.selectedToolIds.length === 0) {
      return "Stage required at least one structured tool call before completion.";
    }

    if (!normalizedStage.completionRule.allowEmptyResult && result.reportedFindings.length === 0) {
      return "Stage does not allow an empty finding set.";
    }

    if (result.reportedFindings.length < normalizedStage.completionRule.minFindings) {
      return `Stage requires at least ${normalizedStage.completionRule.minFindings} structured finding(s).`;
    }

    if (
      normalizedStage.completionRule.maxFindings !== undefined
      && result.reportedFindings.length > normalizedStage.completionRule.maxFindings
    ) {
      return `Stage allows at most ${normalizedStage.completionRule.maxFindings} structured finding(s).`;
    }

    const missingEvidenceTypes = normalizedStage.requiredEvidenceTypes.filter((requiredType) => !availableEvidenceTypes.has(requiredType));
    if (missingEvidenceTypes.length > 0) {
      return `Stage is missing required evidence types: ${missingEvidenceTypes.join(", ")}.`;
    }

    if (result.stageResult) {
      const missingReferencedFindings = result.stageResult.findingIds.filter((findingId) => !findingIds.has(findingId));
      if (missingReferencedFindings.length > 0) {
        return `Stage result referenced unknown findings: ${missingReferencedFindings.join(", ")}.`;
      }

      const unreferencedFindings = result.reportedFindings
        .map((finding) => finding.id)
        .filter((findingId) => !result.stageResult?.findingIds.includes(findingId));
      if (unreferencedFindings.length > 0) {
        return `Stage result did not reference every reported finding: ${unreferencedFindings.join(", ")}.`;
      }
    }

    return null;
  }

  private async runToolLoopForStage(input: ToolLoopContext): Promise<ToolLoopResult> {
    const executableTools = input.tools.filter((candidate) =>
      candidate.executorType === "bash"
      && Boolean(candidate.bashSource.trim())
      && Boolean(candidate.description?.trim())
    );
    const degradedTools: DegradedTool[] = [
      ...input.stage.allowedToolIds
        .filter((toolId) => !input.tools.some((candidate) => candidate.id === toolId))
        .map((toolId) => ({
          toolId,
          toolName: toolId,
          reason: "Tool referenced by the stage contract could not be loaded."
        })),
      ...input.tools
        .filter((candidate) => !executableTools.some((toolCandidate) => toolCandidate.id === candidate.id))
        .map((candidate) => ({
          toolId: candidate.id,
          toolName: candidate.name,
          reason: candidate.executorType !== "bash"
            ? "Tool is not executable in structured JSON action mode."
            : !candidate.bashSource.trim()
              ? "Tool is missing bash source."
            : "Tool is missing a description."
        }))
    ];

    const sharedState: SharedToolLoopState = {
      executableTools,
      degradedTools,
      executedResults: [],
      reportedFindings: [],
      stageResult: null
    };

    if (degradedTools.length > 0) {
      const validationError = `Workflow stage ${input.stage.label} has unavailable tools. ${summarizeDegradedTools(degradedTools)}`;
      return {
        selectedToolIds: [],
        selectedToolNames: [],
        assistantText: validationError,
        rawModelOutput: "",
        executedResults: [],
        degradedTools,
        reportedFindings: [],
        stageResult: null,
        validationError
      };
    }

    return this.runJsonToolLoopForStage(input, sharedState);
  }

  private async executeWorkflowEvidenceTool(
    input: ToolLoopContext,
    state: SharedToolLoopState,
    candidate: AiTool,
    rawInput: unknown
  ) {
    const startedAt = Date.now();
    const toolInput = normalizeToolInput(rawInput);
    const executionTarget = parseExecutionTarget(toolInput, input.target);
    const request = compileToolRequestFromDefinition(candidate, {
      target: executionTarget.target,
      ...(executionTarget.port == null ? {} : { port: executionTarget.port }),
      layer: inferLayer(candidate.category),
      justification: `Workflow stage ${input.stage.label}: ${input.stage.objective}`,
      toolInput
    });

    const brokerResult = await this.broker.executeRequests({
      scan: input.scan,
      tacticId: input.stage.id,
      agentId: input.agent.id,
      requests: [request]
    });
    const toolRun = brokerResult.toolRuns[0];
    if (!toolRun) {
      throw new Error(`Workflow tool execution did not create a tool run for ${candidate.name}.`);
    }

    const result: ExecutedToolResult = {
      mode: "executed",
      toolId: candidate.id,
      toolName: candidate.name,
      toolInput,
      toolRequest: request,
      toolRun,
      observationSummaries: brokerResult.observations.map((observation) => observation.summary),
      findingSummaries: brokerResult.findings.map((finding) => finding.title),
      outputPreview: truncate(toolRun.output ?? toolRun.statusReason ?? `${candidate.name} completed.`),
      fullOutput: toolRun.output ?? toolRun.statusReason ?? "",
      durationMs: Date.now() - startedAt,
      configuredTimeoutMs: typeof request.parameters["timeoutMs"] === "number" ? request.parameters["timeoutMs"] : null,
      timedOut: (toolRun.statusReason ?? "").toLowerCase().includes("timed out")
    };
    state.executedResults.push(result);

    return result;
  }

  private reportWorkflowFinding(
    input: ToolLoopContext,
    state: SharedToolLoopState,
    rawInput: unknown
  ) {
    const findingInput = workflowFindingSubmissionSchema.parse(rawInput);
    if (!input.stage.findingPolicy.allowedTypes.includes(findingInput.type)) {
      throw new Error(`Finding type ${findingInput.type} is not allowed in this workflow stage.`);
    }

    const finding: WorkflowReportedFinding = {
      id: randomUUID(),
      workflowRunId: input.run.id,
      workflowStageId: input.stage.id,
      createdAt: new Date().toISOString(),
      ...findingInput
    };
    state.reportedFindings.push(finding);
    return finding;
  }

  private submitWorkflowStageResult(
    input: ToolLoopContext,
    state: SharedToolLoopState,
    rawInput: unknown
  ) {
    const resultInput = workflowStageResultSubmissionSchema.parse(rawInput);
    const unknownFindingIds = resultInput.findingIds.filter((findingId) => !state.reportedFindings.some((finding) => finding.id === findingId));
    if (unknownFindingIds.length > 0) {
      throw new Error(`Stage result referenced unknown finding ids: ${unknownFindingIds.join(", ")}`);
    }

    state.stageResult = {
      ...resultInput,
      submittedAt: new Date().toISOString()
    };

    return state.stageResult;
  }

  private buildToolLoopResult(
    rawModelOutput: string,
    assistantText: string,
    state: SharedToolLoopState,
    stage: WorkflowStage
  ): ToolLoopResult {
    const validationError = this.validateStageContractOutcome(stage, {
      selectedToolIds: [...new Set(state.executedResults.map((candidate) => candidate.toolId))],
      reportedFindings: state.reportedFindings,
      stageResult: state.stageResult
    });

    return {
      selectedToolIds: [...new Set(state.executedResults.map((candidate) => candidate.toolId))],
      selectedToolNames: [...new Set(state.executedResults.map((candidate) => candidate.toolName))],
      assistantText: assistantText.trim(),
      rawModelOutput: rawModelOutput.trim(),
      executedResults: state.executedResults,
      degradedTools: state.degradedTools,
      reportedFindings: state.reportedFindings,
      stageResult: state.stageResult,
      validationError
    };
  }

  private buildJsonActionMessages(
    input: ToolLoopContext,
    state: SharedToolLoopState
  ): LocalWorkflowModelMessage[] {
    return [
      {
        role: "system",
        content: [
          input.agent.systemPrompt,
          "You are running in structured JSON action mode.",
          "Return exactly one JSON object per turn.",
          "Valid actions are:",
          '- {"action":"call_tool","toolId":"string","input":{...},"reasoning":"string"}',
          '- {"action":"report_finding","finding":{...},"reasoning":"string"}',
          '- {"action":"submit_stage_result","result":{...},"reasoning":"string"}',
          "Use only allowed tool ids.",
          "Do not invent tool results.",
          "Every concrete finding must be submitted through report_finding.",
          "You must finish by calling submit_stage_result exactly once.",
          `Finding schema: ${JSON.stringify(workflowFindingToolInputJsonSchema)}`,
          `Stage result schema: ${JSON.stringify(workflowStageResultToolInputJsonSchema)}`
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Target application: ${input.application.name}`,
          `Target URL: ${input.target.baseUrl}`,
          input.runtime ? `Runtime: ${input.runtime.name} (${input.runtime.provider}, ${input.runtime.region})` : "",
          `Workflow stage: ${input.stage.label}`,
          `Stage objective: ${input.stage.objective}`,
          `Allowed evidence tools: ${state.executableTools.map((tool) => `${tool.id}=${tool.name}`).join(", ") || "none"}`,
          `Tool input schemas: ${JSON.stringify(Object.fromEntries(state.executableTools.map((tool) => [tool.id, tool.inputSchema])))}`,
          `Allowed finding types: ${input.stage.findingPolicy.allowedTypes.join(", ")}`,
          `Required evidence types: ${input.stage.requiredEvidenceTypes.join(", ") || "none"}`,
          `Completion rule: ${JSON.stringify(input.stage.completionRule)}`,
          "Start with the next best action."
        ].filter(Boolean).join("\n")
      }
    ];
  }

  private async runJsonToolLoopForStage(
    input: ToolLoopContext,
    state: SharedToolLoopState
  ): Promise<ToolLoopResult> {
    const messages = this.buildJsonActionMessages(input, state);

    const rawResponses: string[] = [];
    const reasoningNotes: string[] = [];
    const modelName = input.agent.modelOverride ?? input.provider.model;

    for (let iteration = 0; iteration < 8; iteration += 1) {
      const rawContent = await this.callWorkflowModel(input.provider, modelName, messages);
      rawResponses.push(rawContent);
      messages.push({ role: "assistant", content: rawContent });

      let actionEnvelope: Record<string, unknown>;
      try {
        actionEnvelope = this.parseJsonObjectFromModel(rawContent);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        messages.push({ role: "user", content: `Invalid JSON action: ${message}. Return one valid JSON action object.` });
        reasoningNotes.push(message);
        continue;
      }

      const action = typeof actionEnvelope["action"] === "string" ? actionEnvelope["action"] : "";
      const reasoning = typeof actionEnvelope["reasoning"] === "string" ? actionEnvelope["reasoning"] : "";
      if (reasoning) {
        reasoningNotes.push(reasoning);
      }

      try {
        if (action === "call_tool") {
          const toolId = typeof actionEnvelope["toolId"] === "string" ? actionEnvelope["toolId"] : "";
          const tool = state.executableTools.find((candidate) => candidate.id === toolId);
          if (!tool) {
            throw new Error(`Tool ${toolId || "<missing>"} is not available in this stage.`);
          }

          const toolResult = await this.executeWorkflowEvidenceTool(input, state, tool, actionEnvelope["input"]);
          messages.push({
            role: "user",
            content: JSON.stringify({
              toolResult: {
                toolId: tool.id,
                toolName: tool.name,
                status: toolResult.toolRun.status,
                outputPreview: toolResult.outputPreview,
                observationSummaries: toolResult.observationSummaries,
                findingSummaries: toolResult.findingSummaries,
                timedOut: toolResult.timedOut
              }
            })
          });
          continue;
        }

        if (action === "report_finding") {
          const finding = this.reportWorkflowFinding(input, state, actionEnvelope["finding"]);
          messages.push({
            role: "user",
            content: JSON.stringify({
              findingAccepted: true,
              findingId: finding.id
            })
          });
          continue;
        }

        if (action === "submit_stage_result") {
          const stageResult = this.submitWorkflowStageResult(input, state, actionEnvelope["result"]);
          messages.push({
            role: "user",
            content: JSON.stringify({
              stageResultAccepted: true,
              findingCount: stageResult.findingIds.length
            })
          });
          break;
        }

        messages.push({ role: "user", content: `Unsupported action ${action || "<missing>"}. Return a valid action.` });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        messages.push({ role: "user", content: `Action failed: ${message}. Choose the next best valid action.` });
        reasoningNotes.push(message);
      }
    }

    return this.buildToolLoopResult(
      rawResponses.join("\n\n"),
      reasoningNotes.join("\n"),
      state,
      input.stage
    );
  }

  private async callWorkflowModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalWorkflowModelMessage[]
  ) {
    if (provider.kind === "local") {
      return this.callLocalWorkflowModel(provider, model, messages);
    }

    return this.callHostedWorkflowModel(provider, model, messages);
  }

  private async callHostedWorkflowModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalWorkflowModelMessage[]
  ) {
    const languageModel = this.createAnthropicLanguageModel(provider, model);
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const prompt = messages
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
      .join("\n\n");

    const result = await generateText({
      model: languageModel,
      system,
      prompt
    });

    const content = result.text.trim();
    if (!content) {
      throw new Error("Hosted provider returned an empty workflow response.");
    }

    return content;
  }

  private async callLocalWorkflowModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalWorkflowModelMessage[]
  ) {
    const baseUrl = provider.baseUrl;
    if (!baseUrl) {
      throw new Error("Local workflow execution requires a provider base URL.");
    }

    const response = await fetch(new URL("/api/chat", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: {
          temperature: 0
        },
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`Local provider request failed with status ${response.status}.`);
    }

    const payload = await response.json() as { message?: { content?: string } };
    const content = payload.message?.content?.trim();
    if (!content) {
      throw new Error("Local provider returned an empty workflow response.");
    }

    return content;
  }

  private parseJsonObjectFromModel(rawContent: string) {
    const trimmed = rawContent.trim();
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error("Model response did not contain a JSON object.");
    }

    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Model response was not a JSON object.");
    }

    return parsed as Record<string, unknown>;
  }
}
