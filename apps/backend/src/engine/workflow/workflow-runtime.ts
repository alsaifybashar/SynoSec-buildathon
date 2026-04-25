import { randomUUID } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import type {
  AiTool,
  Scan,
  StartWorkflowRunBody,
  ToolRequest,
  ToolRun,
  Workflow,
  WorkflowLiveModelOutput,
  WorkflowReportedFinding,
  WorkflowRun,
  WorkflowRunCoverageResponse,
  WorkflowRunFindingsResponse,
  WorkflowRunReport,
  WorkflowRunTranscriptResponse,
  WorkflowStage,
  WorkflowStageResult,
  WorkflowTraceEvent
} from "@synosec/contracts";
import {
  buildWorkflowRunReport,
  buildWorkflowTranscript,
  getToolLookup,
  getWorkflowReportedFindings,
  getWorkflowRunCoverage,
  workflowFindingSubmissionSchema
} from "@synosec/contracts";
import { z } from "zod";
import type { WorkflowExecutionEngine } from "@/engine/contracts.js";
import { createScan, getScan } from "@/engine/scans/index.js";
import { type AttackMapNode, type AttackPlanPhase, type OrchestratorExecutionEngineService } from "@/engine/orchestrator/index.js";
import { RequestError } from "@/shared/http/request-error.js";
import { type ToolRuntime } from "@/modules/ai-tools/index.js";
import { derivePrivilegeProfile, deriveSandboxProfile } from "@/modules/ai-tools/tool-execution-config.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository, StoredAiProvider } from "@/modules/ai-providers/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/workflows.repository.js";
import { ToolBroker } from "./broker/tool-broker.js";
import {
  authorizeToolAgainstConstraints,
  resolveEffectiveExecutionConstraints,
  type EffectiveExecutionConstraintSet
} from "./execution-constraints.js";
import { inferLayer, normalizeToolInput, parseExecutionTarget, truncate } from "./workflow-execution.utils.js";
import type { WorkflowRunStream } from "./workflow-run-stream.js";

export interface WorkflowArtifactReader {
  getTranscript(runId: string): Promise<WorkflowRunTranscriptResponse>;
  getFindings(runId: string): Promise<WorkflowRunFindingsResponse>;
  getCoverage(runId: string): Promise<WorkflowRunCoverageResponse>;
  getReport(runId: string): Promise<WorkflowRunReport>;
}

export interface WorkflowRuntime extends WorkflowExecutionEngine, WorkflowArtifactReader {}

export interface WorkflowRuntimePorts {
  workflowsRepository: WorkflowsRepository;
  targetsRepository: TargetsRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiToolsRepository: AiToolsRepository;
  toolRuntime: ToolRuntime;
  workflowRunStream: WorkflowRunStream;
  orchestratorExecutionEngine: OrchestratorExecutionEngineService;
  executionReportsService: ExecutionReportsService;
}

type RuntimeStartContext = {
  workflow: Workflow;
  run: WorkflowRun;
  targetRecord: NonNullable<Awaited<ReturnType<TargetsRepository["getById"]>>>;
  constraintSet: EffectiveExecutionConstraintSet;
};

type WorkflowStageExecutionContext = RuntimeStartContext & {
  stage: WorkflowStage;
};

type WorkflowStageExecutionOutcome = {
  run: WorkflowRun;
  result: WorkflowStageResult;
};

export interface WorkflowKindHandler {
  kind: NonNullable<Workflow["executionKind"]> | "workflow";
  execute(context: RuntimeStartContext): Promise<void>;
}

export interface WorkflowStageRunner {
  run(context: WorkflowStageExecutionContext): Promise<WorkflowStageExecutionOutcome>;
}

type ExecutedToolResult = {
  toolId: string;
  toolName: string;
  toolInput: Record<string, string | number | boolean | string[]>;
  toolRequest: ToolRequest;
  toolRun: ToolRun;
  status: ToolRun["status"];
  observations: string[];
  observationKeys: string[];
  outputPreview: string;
  fullOutput: string;
};

type PipelineTerminalState =
  | {
      status: "completed";
      summary: string;
      recommendedNextStep: string;
      residualRisk: string;
      handoff: Record<string, unknown> | null;
    }
  | {
      status: "failed";
      reason: string;
      summary: string;
    };

type PersistedWorkflowTraceType =
  | "system_message"
  | "model_decision"
  | "tool_call"
  | "tool_result"
  | "verification"
  | "finding_reported"
  | "agent_summary"
  | "stage_completed"
  | "stage_failed"
  | "run_completed"
  | "run_failed";

function createWorkflowScan(run: WorkflowRun, constraints: EffectiveExecutionConstraintSet): Scan {
  return {
    id: run.id,
    scope: {
      targets: [constraints.normalizedTarget.host],
      exclusions: constraints.excludedPaths,
      trustZones: [],
      connectivity: [],
      layers: ["L4", "L7"],
      maxDepth: 3,
      maxDurationMinutes: 15,
      rateLimitRps: constraints.rateLimitRps,
      allowActiveExploits: constraints.allowActiveExploit,
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

export class WorkflowRuntimeService implements WorkflowRuntime {
  private readonly broker: ToolBroker;
  private readonly workflowHandler: WorkflowKindHandler;
  private readonly attackMapHandler: WorkflowKindHandler;

  constructor(private readonly ports: WorkflowRuntimePorts) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
    this.workflowHandler = new DefaultWorkflowKindHandler(this, new DefaultWorkflowStageRunner(this));
    this.attackMapHandler = new AttackMapWorkflowKindHandler(this);
  }

  async launchWorkflowRun(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowRun> {
    void input;

    await this.prepareWorkflowStart(workflowId);

    const run = await this.ports.workflowsRepository.createRun(workflowId);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    this.publishSnapshot(run);
    return run;
  }

  async startRun(workflowId: string, input: StartWorkflowRunBody = {}): Promise<WorkflowRun> {
    const run = await this.launchWorkflowRun(workflowId, input);
    void this.runWorkflowRun(run.id);
    return run;
  }

  async runWorkflowRun(runId: string): Promise<void> {
    const context = await this.loadRuntimeStartContextForRun(runId);
    const handler = context.workflow.executionKind === "attack-map"
      ? this.attackMapHandler
      : this.workflowHandler;

    try {
      await handler.execute(context);
    } catch (error) {
      await this.failWorkflowRunAfterUnhandledError(context.run.id, context.workflow.id, error);
    }
  }

  async stepRun(_runId: string): Promise<void> {
    throw new RequestError(400, "Pipeline runs advance automatically after start.");
  }

  async getTranscript(runId: string): Promise<WorkflowRunTranscriptResponse> {
    const { run, workflow } = await this.loadRunContext(runId);
    const agents = await this.loadAgents(workflow);
    const tools = await this.loadTools(workflow, agents);

    return {
      runId: run.id,
      transcript: buildWorkflowTranscript({
        workflow,
        run,
        agents,
        toolLookup: getToolLookup(tools),
        running: run.status === "running"
      })
    };
  }

  async getFindings(runId: string): Promise<WorkflowRunFindingsResponse> {
    const { run } = await this.loadRunContext(runId);
    return {
      runId: run.id,
      findings: getWorkflowReportedFindings(run)
    };
  }

  async getCoverage(runId: string): Promise<WorkflowRunCoverageResponse> {
    const { run } = await this.loadRunContext(runId);
    return {
      runId: run.id,
      layers: getWorkflowRunCoverage(run)
    };
  }

  async getReport(runId: string): Promise<WorkflowRunReport> {
    const { run } = await this.loadRunContext(runId);
    const report = buildWorkflowRunReport(run);
    if (!report) {
      throw new RequestError(404, "Workflow run report not found.");
    }
    return report;
  }

  private async prepareWorkflowStart(workflowId: string) {
    const workflow = await this.ports.workflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const targetRecord = await this.ports.targetsRepository.getById(workflow.targetId);
    if (!targetRecord) {
      throw new RequestError(400, "Workflow target not found.");
    }

    const constraintSet = resolveEffectiveExecutionConstraints(targetRecord, 5);
    const orderedStages = this.getOrderedStages(workflow);
    for (const stage of orderedStages) {
      await this.loadStageDependencies(
        stage,
        targetRecord,
        constraintSet,
        workflow.executionKind === "attack-map" ? "attack-map" : "workflow"
      );
    }

    return {
      workflow,
      targetRecord,
      constraintSet
    };
  }

  private async loadRuntimeStartContextForRun(runId: string): Promise<RuntimeStartContext> {
    const { run, workflow } = await this.loadRunContext(runId);
    const targetRecord = await this.ports.targetsRepository.getById(workflow.targetId);
    if (!targetRecord) {
      throw new RequestError(400, "Workflow target not found.");
    }

    return {
      workflow,
      run,
      targetRecord,
      constraintSet: resolveEffectiveExecutionConstraints(targetRecord, 5)
    };
  }

  getOrderedStages(workflow: Workflow): WorkflowStage[] {
    const orderedStages = [...workflow.stages].sort((left, right) => left.ord - right.ord);
    if (orderedStages.length === 0) {
      throw new RequestError(400, "Workflow is missing its persisted stage contract.");
    }

    for (const stage of orderedStages) {
      if (!stage.id || !stage.agentId || !stage.label || !stage.objective) {
        throw new RequestError(400, "Workflow stage contract is invalid.");
      }
    }

    return orderedStages;
  }

  async loadStageDependencies(
    stage: WorkflowStage,
    targetRecord: RuntimeStartContext["targetRecord"],
    constraintSet: EffectiveExecutionConstraintSet,
    executionKind: Workflow["executionKind"]
  ) {
    const agent = await this.ports.aiAgentsRepository.getById(stage.agentId);
    if (!agent) {
      throw new RequestError(400, "Workflow agent not found.");
    }

    const provider = await this.ports.aiProvidersRepository.getStoredById(agent.providerId);
    if (executionKind === "attack-map") {
      this.assertProviderSupportsAttackMapWorkflowExecution(provider);
    } else {
      this.assertProviderSupportsWorkflowExecution(provider);
    }

    const target = {
      baseUrl: constraintSet.normalizedTarget.baseUrl ?? targetRecord.baseUrl ?? `http://${constraintSet.normalizedTarget.host}`,
      host: constraintSet.normalizedTarget.host,
      ...(constraintSet.normalizedTarget.port === undefined ? {} : { port: constraintSet.normalizedTarget.port })
    };

    const tools = (
      await Promise.all(stage.allowedToolIds.map(async (toolId) => this.ports.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

    if (!constraintSet.localhostException) {
      const incompatibleTool = tools.find((tool) => !authorizeToolAgainstConstraints(constraintSet, tool, {
        toolId: tool.id,
        tool: tool.name,
        executorType: "bash",
        capabilities: tool.capabilities,
        target: target.host,
        ...(target.port === undefined ? {} : { port: target.port }),
        layer: inferLayer(tool.category),
        riskTier: tool.riskTier,
        justification: `Preflight compatibility check for ${tool.name}.`,
        sandboxProfile: deriveSandboxProfile(tool.riskTier),
        privilegeProfile: derivePrivilegeProfile(tool.riskTier),
        parameters: {
          bashSource: tool.bashSource ?? "",
          commandPreview: tool.name,
          toolInput: {
            target: target.host,
            ...(target.baseUrl ? { baseUrl: target.baseUrl } : {})
          }
        }
      }).allowed);

      if (incompatibleTool) {
        throw new RequestError(400, `Workflow cannot start because ${incompatibleTool.name} is not compatible with the active target constraints.`, {
          code: "WORKFLOW_TOOL_CONSTRAINT_INCOMPATIBLE",
          userFriendlyMessage: `Workflow cannot start because ${incompatibleTool.name} cannot enforce the active target policy.`
        });
      }
    }

    return {
      agent,
      provider,
      target,
      tools
    };
  }

  async executeWorkflowStage(context: WorkflowStageExecutionContext): Promise<WorkflowStageExecutionOutcome> {
    const { workflow, run, stage, targetRecord, constraintSet } = context;
    const { agent, provider, target, tools } = await this.loadStageDependencies(stage, targetRecord, constraintSet, workflow.executionKind);

    let currentRun = run;
    let ord = currentRun.events.length;
    const appendEvent = async (
      type: WorkflowTraceEvent["type"],
      status: WorkflowTraceEvent["status"],
      payload: Record<string, unknown>,
      title: string,
      summary: string,
      detail?: string | null,
      patch?: { status?: WorkflowRun["status"]; completedAt?: string | null; currentStepIndex?: number },
      options?: {
        rawStreamPartType?: string;
        liveModelOutput?: WorkflowLiveModelOutput | null;
      }
    ) => {
      currentRun = await this.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflow.id, stage.id, ord++, type, status, payload, title, summary, detail, options?.rawStreamPartType),
        patch,
        options?.liveModelOutput
      );
      return currentRun;
    };

    const systemPrompt = this.buildSystemPrompt(agent.systemPrompt, workflow, stage);
    const taskPrompt = this.buildTaskPrompt(workflow, stage, targetRecord, target.baseUrl);
    const toolContext = this.formatToolContextSections([
      {
        title: "Evidence tools",
        tools: tools
          .filter((tool) => tool.executorType === "bash")
          .map((tool) => ({
            name: tool.name,
            description: tool.description
          }))
      },
      {
        title: "Built-in actions",
        tools: [
          {
            name: "log_progress",
            description: "Persist one short operator-visible progress update for the workflow transcript."
          },
          {
            name: "report_finding",
            description: "Persist one evidence-backed workflow finding."
          },
          {
            name: "complete_run",
            description: "Submit the current workflow stage result."
          },
          {
            name: "fail_run",
            description: "Finish the workflow stage as failed."
          }
        ]
      }
    ]);

    await appendEvent("system_message", "completed", {
      title: "Rendered system prompt",
      summary: "Persisted the workflow pipeline system prompt.",
      body: systemPrompt,
      messageKind: "prompt",
      promptKind: "system"
    }, "Rendered system prompt", "Persisted the workflow pipeline system prompt.", systemPrompt);

    await appendEvent("system_message", "completed", {
      title: "Rendered task prompt",
      summary: "Persisted the workflow pipeline task prompt.",
      body: taskPrompt,
      messageKind: "prompt",
      promptKind: "task"
    }, "Rendered task prompt", "Persisted the workflow pipeline task prompt.", taskPrompt);

    if (toolContext) {
      await appendEvent("system_message", "completed", {
        title: "Tool context",
        summary: "Persisted the tool inventory exposed to the workflow model.",
        body: toolContext
      }, "Tool context", "Persisted the tool inventory exposed to the workflow model.", toolContext);
    }

    const scan = createWorkflowScan(currentRun, constraintSet);
    await this.ensureWorkflowScan(scan, targetRecord.id, agent.id);
    const executedResults: ExecutedToolResult[] = [];
    const reportedFindings = new Map(getWorkflowReportedFindings(currentRun).map((finding) => [finding.id, finding]));
    let terminalState: PipelineTerminalState | null = null;
    let liveModelOutput: WorkflowLiveModelOutput | null = null;
    const abortController = new AbortController();
    const liveOutputSource: WorkflowLiveModelOutput["source"] = provider.kind === "local" ? "local" : "hosted";

    const hasTraceEvent = (traceEventId: string) => currentRun.events.some((event) => event.id === traceEventId);
    const hasToolRunRef = (toolRunRef: string) => executedResults.some((result) => result.toolRun.id === toolRunRef);
    const hasObservationRef = (observationRef: string) => executedResults.some((result) => result.observationKeys.includes(observationRef));
    const hasArtifactRef = (artifactRef: string) =>
      executedResults.some((result) => result.toolRun.id === artifactRef)
      || [...reportedFindings.values()].some((finding) => finding.evidence.some((entry) => entry.artifactRef === artifactRef));

    const appendLiveText = (delta: string) => {
      if (!liveModelOutput) {
        liveModelOutput = {
          runId: currentRun.id,
          source: liveOutputSource,
          text: "",
          reasoning: null,
          final: false,
          createdAt: new Date().toISOString()
        };
      }
      liveModelOutput = {
        ...liveModelOutput,
        text: `${liveModelOutput.text}${delta}`,
        final: false,
        createdAt: new Date().toISOString()
      };
      return liveModelOutput;
    };

    const appendLiveReasoning = (delta: string) => {
      if (!liveModelOutput) {
        liveModelOutput = {
          runId: currentRun.id,
          source: liveOutputSource,
          text: "",
          reasoning: null,
          final: false,
          createdAt: new Date().toISOString()
        };
      }
      liveModelOutput = {
        ...liveModelOutput,
        reasoning: `${liveModelOutput.reasoning ?? ""}${delta}`,
        final: false,
        createdAt: new Date().toISOString()
      };
      return liveModelOutput;
    };

    const finalizeLiveModelOutput = () => {
      if (!liveModelOutput) {
        return null;
      }
      const finalOutput: WorkflowLiveModelOutput = {
        ...liveModelOutput,
        final: true,
        createdAt: new Date().toISOString()
      };
      liveModelOutput = null;
      return finalOutput;
    };

    const bashTools = tools.filter((tool) => tool.executorType === "bash" && Boolean(tool.bashSource));
    const evidenceTools = Object.fromEntries(bashTools.map((tool) => [
      tool.id,
      createSdkTool({
        description: tool.description ?? tool.name,
        inputSchema: z.object({}).catchall(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
        execute: async (rawInput) => {
          const toolInput = normalizeToolInput(rawInput);
          const executionTarget = parseExecutionTarget(toolInput, target);
          const request = await this.ports.toolRuntime.compile(tool.id, {
            target: executionTarget.target,
            ...(executionTarget.port === undefined ? {} : { port: executionTarget.port }),
            layer: inferLayer(tool.category),
            justification: `Evidence collection for workflow ${workflow.name}.`,
            toolInput
          });
          const brokerResult = await this.broker.executeRequests({
            scan,
            tacticId: workflow.id,
            agentId: agent.id,
            requests: [request],
            constraintSet,
            toolLookup: {
              [tool.id]: tool
            }
          });
          const toolRun = brokerResult.toolRuns[0];
          if (!toolRun) {
            throw new Error(`Workflow tool execution did not create a tool run for ${tool.name}.`);
          }

          const result: ExecutedToolResult = {
            toolId: tool.id,
            toolName: tool.name,
            toolInput,
            toolRequest: request,
            toolRun,
            status: toolRun.status,
            observations: brokerResult.observations.map((observation) => observation.summary),
            observationKeys: brokerResult.observations.map((observation) => observation.key),
            outputPreview: truncate(
              brokerResult.observations[0]?.summary
                ?? toolRun.statusReason
                ?? toolRun.output
                ?? `${tool.name} ${toolRun.status}.`
            ),
            fullOutput: toolRun.output ?? toolRun.statusReason ?? ""
          };
          executedResults.push(result);

          return {
            toolRunId: toolRun.id,
            toolId: tool.id,
            toolName: tool.name,
            status: toolRun.status,
            outputPreview: result.outputPreview,
            observations: result.observations
          };
        }
      })
    ]));

    const systemTools = {
      log_progress: createSdkTool({
        description: "Persist one short operator-visible progress update for the workflow transcript.",
        inputSchema: z.object({
          message: z.string().min(1).max(400)
        }),
        execute: async (rawInput) => {
          const note = z.object({
            message: z.string().min(1).max(400)
          }).parse(rawInput);
          const message = note.message.trim();
          await appendEvent("text", "completed", {
            text: message,
            source: "log_progress"
          }, "Agent progress update", truncate(message, 80), message);
          return { accepted: true };
        }
      }),
      report_finding: createSdkTool({
        description: "Persist one evidence-backed workflow finding.",
        inputSchema: workflowFindingSubmissionSchema,
        execute: async (rawInput) => {
          const findingInput = workflowFindingSubmissionSchema.parse(rawInput);
          for (const evidence of findingInput.evidence) {
            if (evidence.traceEventId && !hasTraceEvent(evidence.traceEventId)) {
              throw new RequestError(400, `Unknown trace event reference: ${evidence.traceEventId}`);
            }
            if (evidence.toolRunRef && !hasToolRunRef(evidence.toolRunRef)) {
              throw new RequestError(400, `Unknown tool run reference: ${evidence.toolRunRef}`);
            }
            if (evidence.observationRef && !hasObservationRef(evidence.observationRef)) {
              throw new RequestError(400, `Unknown observation reference: ${evidence.observationRef}`);
            }
            if (evidence.artifactRef && !hasArtifactRef(evidence.artifactRef)) {
              throw new RequestError(400, `Unknown artifact reference: ${evidence.artifactRef}`);
            }
          }

          for (const relatedFindingId of [
            ...findingInput.derivedFromFindingIds,
            ...findingInput.relatedFindingIds,
            ...findingInput.enablesFindingIds
          ]) {
            if (!reportedFindings.has(relatedFindingId)) {
              throw new RequestError(400, `Unknown finding reference: ${relatedFindingId}`);
            }
          }

          const finding: WorkflowReportedFinding = {
            id: randomUUID(),
            workflowRunId: currentRun.id,
            createdAt: new Date().toISOString(),
            ...findingInput
          };
          reportedFindings.set(finding.id, finding);
          await appendEvent("finding_reported", "completed", {
            finding
          }, `Finding reported: ${finding.title}`, `${finding.severity.toUpperCase()} ${finding.type} on ${finding.target.host}.`, finding.impact);
          return {
            findingId: finding.id,
            title: finding.title,
            severity: finding.severity,
            host: finding.target.host
          };
        }
      }),
      complete_run: createSdkTool({
        description: "Submit the current workflow stage result.",
        inputSchema: z.object({
          summary: z.string().min(1),
          recommendedNextStep: z.string().min(1),
          residualRisk: z.string().min(1),
          handoff: z.record(z.string(), z.unknown()).nullable().optional()
        }),
        execute: async (rawInput) => {
          const completion = z.object({
            summary: z.string().min(1),
            recommendedNextStep: z.string().min(1),
            residualRisk: z.string().min(1),
            handoff: z.record(z.string(), z.unknown()).nullable().optional()
          }).parse(rawInput);
          terminalState = {
            status: "completed",
            summary: completion.summary,
            recommendedNextStep: completion.recommendedNextStep,
            residualRisk: completion.residualRisk,
            handoff: completion.handoff ?? null
          };
          abortController.abort("workflow-completed");
          return { accepted: true };
        }
      }),
      fail_run: createSdkTool({
        description: "Finish the workflow stage as failed.",
        inputSchema: z.object({
          reason: z.string().min(1),
          summary: z.string().min(1).optional()
        }),
        execute: async (rawInput) => {
          const failure = z.object({
            reason: z.string().min(1),
            summary: z.string().min(1).optional()
          }).parse(rawInput);
          terminalState = {
            status: "failed",
            reason: failure.reason,
            summary: failure.summary ?? failure.reason
          };
          abortController.abort("workflow-failed");
          return { accepted: true };
        }
      })
    };

    const result = streamText({
      model: this.createAnthropicLanguageModel(provider, agent.modelOverride ?? provider.model),
      system: systemPrompt,
      prompt: taskPrompt,
      tools: {
        ...evidenceTools,
        ...systemTools
      },
      stopWhen: stepCountIs(24),
      abortSignal: abortController.signal
    });

    await appendEvent("start", "running", {
      title: "Pipeline stream started",
      summary: "Started the workflow model stream."
    }, "Pipeline stream started", "Started the workflow model stream.");

    try {
      for await (const rawPart of result.fullStream) {
        const part = rawPart as any;
        switch (part.type) {
          case "start":
            break;
          case "start-step":
            await appendEvent("system_message", "completed", {
              request: part.request.body,
              warnings: part.warnings
            }, "Model step started", "Started a new model step.", null, undefined, {
              rawStreamPartType: part.type
            });
            break;
          case "text": {
            const nextLiveModelOutput = appendLiveText(part.text);
            await appendEvent("model_decision", "running", {
              text: part.text
            }, "Model streamed text", truncate(part.text, 80), part.text, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: nextLiveModelOutput
            });
            break;
          }
          case "reasoning": {
            const nextLiveModelOutput = appendLiveReasoning(part.text);
            await appendEvent("model_decision", "running", {
              text: part.text
            }, "Model streamed reasoning", truncate(part.text, 80), part.text, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: nextLiveModelOutput
            });
            break;
          }
          case "tool-call-streaming-start":
            if (part.toolName === "log_progress") {
              break;
            }
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName
            }, `Calling ${part.toolName}`, `Started streaming arguments for ${part.toolName}.`, null, undefined, {
              rawStreamPartType: part.type
            });
            break;
          case "tool-call-delta":
            if (part.toolName === "log_progress") {
              break;
            }
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              argsTextDelta: part.argsTextDelta
            }, `Calling ${part.toolName}`, `Streaming arguments for ${part.toolName}.`, part.argsTextDelta, undefined, {
              rawStreamPartType: part.type
            });
            break;
          case "tool-call":
            if (part.toolName === "log_progress") {
              break;
            }
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: part.toolName in evidenceTools ? part.toolName : null,
              input: JSON.stringify(part.input, null, 2)
            }, `Calling ${part.toolName}`, `Invoked ${part.toolName}.`, JSON.stringify(part.input, null, 2), undefined, {
              rawStreamPartType: part.type
            });
            break;
          case "tool-result": {
            if (part.toolName === "log_progress") {
              break;
            }
            const toolRunId = typeof part.output === "object" && part.output !== null && "toolRunId" in part.output && typeof part.output.toolRunId === "string"
              ? part.output.toolRunId
              : null;
            const matchingResult = (toolRunId ? executedResults.find((candidate) => candidate.toolRun.id === toolRunId) : null)
              ?? executedResults.find((candidate) => candidate.toolName === part.toolName);
            const resultStatus = part.toolName === "fail_run"
              ? "failed"
              : matchingResult?.status === "failed"
                ? "failed"
                : "completed";
            await appendEvent("tool_result", resultStatus, {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: matchingResult?.toolId ?? null,
              output: part.output,
              summary: matchingResult?.outputPreview ?? `${part.toolName} completed.`,
              observations: matchingResult?.observations ?? []
            }, `${part.toolName} returned`, matchingResult?.outputPreview ?? `${part.toolName} completed.`, matchingResult?.fullOutput ?? null, undefined, {
              rawStreamPartType: part.type
            });
            break;
          }
          case "finish-step": {
            const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
              finishReason: part.finishReason,
              rawFinishReason: part.rawFinishReason,
              usage: part.usage
            }, "Model step finished", `Step finished with reason: ${part.finishReason}.`, null, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            break;
          }
          case "finish": {
            const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
              finishReason: part.finishReason,
              rawFinishReason: part.rawFinishReason,
              totalUsage: part.totalUsage
            }, "Model stream finished", `Stream finished with reason: ${part.finishReason}.`, null, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            break;
          }
          case "error": {
            const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("verification", "failed", {
              message: part.error instanceof Error ? part.error.message : String(part.error),
              detail: part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error)
            }, "Model stream error", part.error instanceof Error ? part.error.message : String(part.error), part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error), undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            break;
          }
          case "abort": {
            const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("verification", "completed", {
              message: typeof part.reason === "string" ? part.reason : "workflow-aborted"
            }, "Model stream aborted", typeof part.reason === "string" ? part.reason : "workflow-aborted", null, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            break;
          }
          default:
            break;
        }
      }
    } catch (error) {
      if (!terminalState) {
        const message = error instanceof Error ? error.message : String(error);
        await appendEvent("verification", "failed", {
          message,
          detail: message
        }, "Pipeline execution error", message, message);
      }
      throw error;
    }

    if (!terminalState) {
      throw new RequestError(500, "The model finished without calling complete_run or fail_run.");
    }

    const finalTerminalState = terminalState as PipelineTerminalState;
    const stageResult: WorkflowStageResult = finalTerminalState.status === "completed"
      ? {
          status: "completed",
          summary: finalTerminalState.summary,
          findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
          recommendedNextStep: finalTerminalState.recommendedNextStep,
          residualRisk: finalTerminalState.residualRisk,
          handoff: finalTerminalState.handoff,
          submittedAt: new Date().toISOString()
        }
      : {
          status: "blocked",
          summary: finalTerminalState.summary,
          findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
          recommendedNextStep: finalTerminalState.reason,
          residualRisk: finalTerminalState.reason,
          handoff: null,
          submittedAt: new Date().toISOString()
        };

    currentRun = await appendEvent(
      "stage_result_submitted",
      finalTerminalState.status === "completed" ? "completed" : "failed",
      {
        stageResult
      },
      `Stage result submitted: ${stage.label}`,
      stageResult.summary,
      stageResult.residualRisk
    );

    return {
      run: currentRun,
      result: stageResult
    };
  }

  async executeAttackMapWorkflowRun(context: RuntimeStartContext): Promise<void> {
    const { workflow, run, targetRecord, constraintSet } = context;
    const stage = this.getOrderedStages(workflow)[0]!;
    const { agent, provider } = await this.loadStageDependencies(stage, targetRecord, constraintSet, "attack-map");
    const orchestrator = this.ports.orchestratorExecutionEngine as unknown as any;

    const target = {
      baseUrl: constraintSet.normalizedTarget.baseUrl ?? targetRecord.baseUrl ?? `http://${constraintSet.normalizedTarget.host}`,
      host: constraintSet.normalizedTarget.host,
      ...(constraintSet.normalizedTarget.port === undefined ? {} : { port: constraintSet.normalizedTarget.port })
    };
    const plannerTools = (
      await Promise.all(stage.allowedToolIds.map((toolId) => this.ports.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

    let currentRun = await this.appendEvent(
      run,
      this.createEvent(run, workflow.id, stage.id, run.events.length, "stage_started", "running", {
        stageLabel: stage.label
      }, `Stage started: ${stage.label}`, `Started ${stage.label}.`),
      { currentStepIndex: 0 }
    );
    let ord = currentRun.events.length;
    const appendEvent = async (
      type: WorkflowTraceEvent["type"],
      status: WorkflowTraceEvent["status"],
      payload: Record<string, unknown>,
      title: string,
      summary: string,
      detail?: string | null,
      patch?: { status?: WorkflowRun["status"]; completedAt?: string | null }
    ) => {
      currentRun = await this.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflow.id, stage.id, ord++, type, status, payload, title, summary, detail),
        patch
      );
      return currentRun;
    };
    const emitReasoning = (phase: string, title: string, summary: string) => appendEvent(
      "reasoning",
      "completed",
      { phase, title, summary },
      title,
      summary,
      null
    );

    const toolActivityById = new Map<string, { phase: string; toolId: string | null; toolName: string; command: string }>();
    const recordToolActivity = async (activity: Record<string, unknown>) => {
      const id = typeof activity["id"] === "string" ? activity["id"] : randomUUID();
      const phase = typeof activity["phase"] === "string" ? activity["phase"] : "execution";
      const toolId = typeof activity["toolId"] === "string" ? activity["toolId"] : null;
      const toolName = typeof activity["toolName"] === "string" ? activity["toolName"] : "Tool";
      const command = typeof activity["command"] === "string" ? activity["command"] : toolName;
      toolActivityById.set(id, { phase, toolId, toolName, command });
      await appendEvent(
        "tool_call",
        "running",
        { phase, toolId, toolName, toolInput: command },
        `Tool started: ${toolName}`,
        `${toolName} started for ${phase}.`,
        command
      );
    };
    const updateToolActivity = async (id: string, patch: Record<string, unknown>) => {
      const activity = toolActivityById.get(id);
      if (!activity) {
        throw new RequestError(500, `Workflow attack-map tool activity ${id} is missing.`);
      }
      const outputPreview = typeof patch["outputPreview"] === "string" ? patch["outputPreview"] : null;
      const status = patch["status"] === "failed" ? "failed" : "completed";
      await appendEvent(
        "tool_result",
        status,
        {
          phase: activity.phase,
          toolId: activity.toolId,
          toolName: activity.toolName,
          toolInput: activity.command,
          output: outputPreview,
          exitCode: typeof patch["exitCode"] === "number" ? patch["exitCode"] : null
        },
        `Tool completed: ${activity.toolName}`,
        outputPreview ?? `${activity.toolName} ${status}.`,
        outputPreview
      );
    };
    const appendReconProbeEvent = async (probe: {
      toolName: string;
      command: string;
      output: string;
      status: "completed" | "failed";
    }) => {
      await appendEvent(
        "tool_call",
        "running",
        { phase: "recon", toolId: null, toolName: probe.toolName, input: probe.command },
        `Tool started: ${probe.toolName}`,
        `${probe.toolName} started for recon.`,
        probe.command
      );
      const outputPreview = probe.status === "failed"
        ? `${probe.toolName} failed during recon.`
        : `${probe.toolName} completed during recon.`;
      await appendEvent(
        "tool_result",
        probe.status,
        {
          phase: "recon",
          toolId: null,
          toolName: probe.toolName,
          summary: outputPreview,
          fullOutput: probe.output
        },
        `Tool completed: ${probe.toolName}`,
        outputPreview,
        probe.output
      );
    };

    const plannerToolContext = this.formatToolContextSections([{
      title: "Planner-visible tools",
      tools: plannerTools.map((tool) => ({
        name: tool.name,
        description: tool.description
      }))
    }]);

    if (plannerToolContext) {
      await appendEvent(
        "system_message",
        "completed",
        {
          title: "Tool context",
          summary: "Persisted the attack-map tool inventory exposed to the planner.",
          body: plannerToolContext
        },
        "Tool context",
        "Persisted the attack-map tool inventory exposed to the planner.",
        plannerToolContext
      );
    }

    const recon = await orchestrator.runRecon(target.baseUrl, run.id, provider, provider.model, (phase: string, title: string, summary: string) => {
      void emitReasoning(phase, title, summary);
    });
    for (const probe of recon.probes) {
      await appendReconProbeEvent(probe);
    }
    await appendEvent(
      "system_message",
      "completed",
      {
        title: "Recon completed",
        summary: `Recon completed for ${target.baseUrl}.`,
        body: JSON.stringify({ openPorts: recon.openPorts, technologies: recon.technologies, serverInfo: recon.serverInfo }, null, 2),
        phase: "recon"
      },
      "Recon completed",
      `Recon completed for ${target.baseUrl}.`,
      recon.rawCurl.slice(0, 1000)
    );

    const plan = await orchestrator.createPlan(target.baseUrl, recon, plannerTools, provider, provider.model, (phase: string, title: string, summary: string) => {
      void emitReasoning(phase, title, summary);
    });
    await appendEvent(
      "system_message",
      "completed",
      {
        title: "Attack plan created",
        summary: plan.summary,
        body: JSON.stringify(plan, null, 2),
        phase: "planning",
        plan
      },
      "Attack plan created",
      plan.summary,
      JSON.stringify(plan, null, 2)
    );

    const findingNodes: AttackMapNode[] = [];
    for (const phase of plan.phases.slice(0, 3)) {
      const result = await orchestrator.executePhase(
        target.baseUrl,
        phase,
        recon,
        run.id,
        provider,
        provider.model,
        (reasonPhase: string, title: string, summary: string) => {
          void emitReasoning(reasonPhase, title, summary);
        },
        recordToolActivity,
        updateToolActivity
      );

      for (const finding of result.findings) {
        const severity = (["critical", "high", "medium", "low", "info"].includes(finding.severity) ? finding.severity : "medium") as WorkflowReportedFinding["severity"];
        const workflowFinding = this.createAttackMapWorkflowFinding({
          runId: currentRun.id,
          target,
          title: finding.title,
          severity,
          description: finding.description,
          vector: finding.vector,
          evidence: result.toolAttempts.length > 0
            ? result.toolAttempts.slice(0, 3).map((attempt: { toolRunId: string; toolName: string; output: string }) => ({
                sourceTool: attempt.toolName,
                quote: (finding.rawEvidence ?? attempt.output).slice(0, 600),
                artifactRef: attempt.toolRunId
              }))
            : [{
                sourceTool: phase.name,
                quote: (finding.rawEvidence ?? finding.description).slice(0, 600),
                externalUrl: target.baseUrl
              }],
          toolCommandPreview: result.probeCommand || null,
          tags: ["attack-map", "workflow-orchestrator", phase.name.toLowerCase().replace(/\s+/g, "-")]
        });
        await appendEvent(
          "finding_reported",
          "completed",
          { finding: workflowFinding, phase: phase.name },
          `Finding reported: ${workflowFinding.title}`,
          `${workflowFinding.severity.toUpperCase()} ${workflowFinding.type} on ${workflowFinding.target.host}.`,
          workflowFinding.impact
        );
        findingNodes.push({
          id: workflowFinding.id,
          type: "finding",
          label: workflowFinding.title,
          status: "completed",
          severity,
          data: {
            description: workflowFinding.impact,
            vector: finding.vector
          }
        });
      }
    }

    for (const finding of findingNodes.filter((node) => node.severity === "critical" || node.severity === "high" || node.severity === "medium").slice(0, 4)) {
      const deepFindings = await orchestrator.deepDiveFinding(
        target.baseUrl,
        finding,
        findingNodes,
        recon,
        provider,
        provider.model,
        (phase: string, title: string, summary: string) => {
          void emitReasoning(phase, title, summary);
        }
      );
      for (const child of deepFindings) {
        const workflowFinding = this.createAttackMapWorkflowFinding({
          runId: currentRun.id,
          target,
          title: child.label,
          severity: child.severity ?? "medium",
          description: String(child.data["description"] ?? ""),
          vector: String(child.data["vector"] ?? ""),
          evidence: [{
            sourceTool: "deep_analysis",
            quote: String(child.data["description"] ?? child.label).slice(0, 600),
            externalUrl: target.baseUrl
          }],
          tags: ["attack-map", "workflow-orchestrator", "deep-analysis"]
        });
        await appendEvent(
          "finding_reported",
          "completed",
          { finding: workflowFinding, phase: "deep_analysis", derivedFrom: finding.label },
          `Finding reported: ${workflowFinding.title}`,
          `${workflowFinding.severity.toUpperCase()} ${workflowFinding.type} on ${workflowFinding.target.host}.`,
          workflowFinding.impact
        );
        findingNodes.push({
          id: workflowFinding.id,
          type: "finding",
          label: workflowFinding.title,
          status: "completed",
          severity: workflowFinding.severity,
          data: {
            description: workflowFinding.impact,
            vector: String(child.data["vector"] ?? "")
          }
        });
      }
    }

    const chains = findingNodes.length >= 2
      ? await orchestrator.correlateAttackChains(findingNodes, target.baseUrl, provider, provider.model, (phase: string, title: string, summary: string) => {
          void emitReasoning(phase, title, summary);
        })
      : [];

    const stageResult: WorkflowStageResult = {
      status: "completed",
      summary: `Attack-map workflow completed. ${plan.phases.length} phases planned, ${getWorkflowReportedFindings(currentRun).length} findings reported, ${chains.length} attack chains identified.`,
      findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
      recommendedNextStep: "Investigate the highest-severity workflow findings and validate the reported attack paths.",
      residualRisk: `Overall attack-map risk remains ${plan.overallRisk}.`,
      handoff: null,
      submittedAt: new Date().toISOString()
    };

    currentRun = await appendEvent(
      "stage_result_submitted",
      "completed",
      { stageResult },
      `Stage result submitted: ${stage.label}`,
      stageResult.summary,
      stageResult.residualRisk
    );
    currentRun = await appendEvent(
      "stage_completed",
      "completed",
      { stageResult, stageLabel: stage.label },
      `Stage completed: ${stage.label}`,
      stageResult.summary
    );
    await appendEvent(
      "run_completed",
      "completed",
      {
        title: "Attack-map workflow completed",
        summary: stageResult.summary,
        body: plan.summary,
        overallRisk: plan.overallRisk,
        chainCount: chains.length,
        findingNodeCount: getWorkflowReportedFindings(currentRun).length,
        recommendedNextStep: stageResult.recommendedNextStep,
        residualRisk: stageResult.residualRisk
      },
      "Attack-map workflow completed",
      stageResult.summary,
      plan.summary,
      {
        status: "completed",
        completedAt: new Date().toISOString()
      }
    );
    await this.ports.executionReportsService.createForWorkflowRun(currentRun.id);
  }

  async appendEvent(
    run: WorkflowRun,
    event: WorkflowTraceEvent,
    patch?: {
      status?: WorkflowRun["status"];
      completedAt?: string | null;
      currentStepIndex?: number;
    },
    liveModelOutput?: WorkflowLiveModelOutput | null
  ): Promise<WorkflowRun> {
    const updatedRun = await this.ports.workflowsRepository.appendRunEvent(run.id, event, patch);
    this.ports.workflowRunStream.publish(updatedRun.id, {
      type: "run_event",
      run: updatedRun,
      event,
      ...(liveModelOutput === undefined ? {} : { liveModelOutput })
    });
    return updatedRun;
  }

  async createExecutionReport(runId: string) {
    await this.ports.executionReportsService.createForWorkflowRun(runId);
  }

  publishSnapshot(run: WorkflowRun, liveModelOutput?: WorkflowLiveModelOutput | null) {
    this.ports.workflowRunStream.publish(run.id, {
      type: "snapshot",
      run,
      ...(liveModelOutput === undefined ? {} : { liveModelOutput })
    });
  }

  createEvent(
    run: WorkflowRun,
    workflowId: string,
    workflowStageId: string | null,
    ord: number,
    type: WorkflowTraceEvent["type"],
    status: WorkflowTraceEvent["status"],
    payload: Record<string, unknown>,
    title: string,
    summary: string,
    detail: string | null = null,
    rawStreamPartType?: string
  ): WorkflowTraceEvent {
    return {
      id: randomUUID(),
      workflowRunId: run.id,
      workflowId,
      workflowStageId,
      stepIndex: run.currentStepIndex,
      ord,
      type: this.mapPersistedTraceType(type),
      status,
      title,
      summary,
      detail,
      payload: this.decorateTracePayloadWithRawType(type, payload, rawStreamPartType),
      createdAt: new Date().toISOString()
    };
  }

  async failRunWithStageError(run: WorkflowRun, workflowId: string, stage: WorkflowStage | null, error: unknown): Promise<WorkflowRun> {
    const message = error instanceof Error ? error.message : String(error);
    let currentRun = run;
    let ord = currentRun.events.length;
    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent(currentRun, workflowId, stage?.id ?? null, ord++, "error", "failed", {
        message
      }, "Workflow execution error", message, message)
    );
    if (stage) {
      currentRun = await this.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflowId, stage.id, ord++, "stage_failed", "failed", {
          reason: message,
          stageLabel: stage.label
        }, `Stage failed: ${stage.label}`, message, message)
      );
    }
    currentRun = await this.appendEvent(
      currentRun,
      this.createEvent(currentRun, workflowId, stage?.id ?? null, ord++, "run_failed", "failed", {
        reason: message
      }, "Pipeline failed", message, message),
      {
        status: "failed",
        completedAt: new Date().toISOString()
      }
    );
    await this.ports.executionReportsService.createForWorkflowRun(currentRun.id);
    return currentRun;
  }

  private buildSystemPrompt(baseSystemPrompt: string, workflow: Workflow, stage: WorkflowStage) {
    return [
      baseSystemPrompt,
      `You are executing the "${stage.label}" stage of the workflow "${workflow.name}".`,
      `Stage objective: ${stage.objective}`,
      "Report concrete findings with report_finding.",
      "Every report_finding must include concrete evidence references so execution reports can build the evidence graph automatically.",
      "Use derivedFromFindingIds, relatedFindingIds, and enablesFindingIds inside report_finding when findings depend on or connect to earlier findings.",
      "Call log_progress before any evidence tool call or tool burst, and again after any meaningful result before deciding the next step.",
      "Use complete_run to submit the current stage result or fail_run to stop with an explicit failure.",
      "Each log_progress update must be concise, operator-visible, and action-oriented.",
      "Keep each log_progress message to 1-2 short sentences describing the next check, what changed, or what you will do next.",
      "Do not expose hidden chain-of-thought or private reasoning. Provide concise action-oriented progress notes only."
    ].join("\n\n");
  }

  private buildTaskPrompt(workflow: Workflow, stage: WorkflowStage, targetRecord: RuntimeStartContext["targetRecord"], targetUrl: string) {
    return [
      `Workflow: ${workflow.name}`,
      `Stage: ${stage.label}`,
      `Target: ${targetRecord.name}`,
      `Target URL: ${targetUrl}`
    ].filter(Boolean).join("\n");
  }

  private formatToolContextSections(sections: Array<{ title: string; tools: Array<{ name: string; description: string | null | undefined }> }>) {
    return sections
      .map((section) => {
        const lines = section.tools
          .map((tool) => `${tool.name}: ${tool.description?.trim() || "No description provided."}`);
        if (lines.length === 0) {
          return null;
        }
        return `${section.title}\n\n${lines.join("\n")}`;
      })
      .filter((section): section is string => Boolean(section))
      .join("\n\n");
  }

  private mapPersistedTraceType(type: WorkflowTraceEvent["type"]): PersistedWorkflowTraceType {
    switch (type) {
      case "tool_call":
      case "tool_call_delta":
      case "tool_call_streaming_start":
        return "tool_call";
      case "tool_result":
        return "tool_result";
      case "finding_reported":
        return "finding_reported";
      case "error":
      case "abort":
        return "verification";
      case "text":
      case "reasoning":
        return "model_decision";
      case "start":
      case "start-step":
      case "finish":
      case "finish-step":
        return "system_message";
      default:
        return type as PersistedWorkflowTraceType;
    }
  }

  private decorateTracePayload(type: WorkflowTraceEvent["type"], payload: Record<string, unknown>) {
    return {
      ...payload,
      streamPartType: type
    };
  }

  private decorateTracePayloadWithRawType(
    type: WorkflowTraceEvent["type"],
    payload: Record<string, unknown>,
    rawStreamPartType?: string
  ) {
    return {
      ...this.decorateTracePayload(type, payload),
      ...(rawStreamPartType ? { rawStreamPartType } : {})
    };
  }

  private assertProviderSupportsWorkflowExecution(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Workflow agent provider not found.");
    }

    if (provider.kind !== "anthropic") {
      throw new RequestError(400, "Workflow pipeline execution requires an Anthropic provider.");
    }

    if (!provider.apiKey) {
      throw new RequestError(400, "Workflow pipeline execution requires an Anthropic API key.");
    }
  }

  private assertProviderSupportsAttackMapWorkflowExecution(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Workflow agent provider not found.");
    }

    if (provider.kind === "anthropic" && !provider.apiKey) {
      throw new RequestError(400, "Attack-map workflow execution requires an Anthropic API key.");
    }

    if (provider.kind === "local" && !provider.baseUrl) {
      throw new RequestError(400, "Attack-map workflow execution requires a local provider base URL.");
    }
  }

  private createAnthropicLanguageModel(provider: StoredAiProvider, model: string): LanguageModel {
    const anthropic = createAnthropic({
      apiKey: provider.apiKey as string,
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {})
    });

    return anthropic(model);
  }

  private async failWorkflowRunAfterUnhandledError(runId: string, workflowId: string, error: unknown) {
    const run = await this.ports.workflowsRepository.getRunById(runId);
    if (!run) {
      console.error("Unhandled workflow pipeline execution failure.", error);
      return;
    }

    try {
      await this.failRunWithStageError(run, workflowId, null, error);
    } catch (updateError) {
      console.error("Failed to persist workflow run failure state.", updateError);
    }

    console.error("Unhandled workflow pipeline execution failure.", error instanceof Error ? error.message : String(error));
  }

  private severityConfidence(severity: WorkflowReportedFinding["severity"]) {
    switch (severity) {
      case "critical":
        return 0.95;
      case "high":
        return 0.85;
      case "medium":
        return 0.72;
      case "low":
        return 0.58;
      case "info":
      default:
        return 0.45;
    }
  }

  private classifyAttackMapFinding(input: { title: string; description: string; vector: string }): WorkflowReportedFinding["type"] {
    const text = `${input.title} ${input.description} ${input.vector}`.toLowerCase();
    if (/sql|sqli|xss|inject|template injection|ssti|command injection|deserialization/.test(text)) {
      return "injection_signal";
    }
    if (/header|csp|hsts|x-frame-options|content-security-policy/.test(text)) {
      return "missing_security_header";
    }
    if (/tls|ssl|certificate|cipher/.test(text)) {
      return "tls_weakness";
    }
    if (/auth|login|session|admin|credential|password|access control/.test(text)) {
      return "auth_weakness";
    }
    if (/sensitive|pii|ssn|secret|token|leak|exposed data/.test(text)) {
      return "sensitive_data_exposure";
    }
    if (/path|endpoint|directory|route|content discovery|hidden page/.test(text)) {
      return "content_discovery";
    }
    if (/port|service|exposed|open service/.test(text)) {
      return "service_exposure";
    }
    if (/config|misconfig|default|insecure setting/.test(text)) {
      return "misconfiguration";
    }
    return "other";
  }

  private createAttackMapWorkflowFinding(input: {
    runId: string;
    target: { baseUrl: string; host: string; port?: number };
    title: string;
    severity: WorkflowReportedFinding["severity"];
    description: string;
    vector: string;
    evidence: WorkflowReportedFinding["evidence"];
    toolCommandPreview?: string | null;
    tags?: string[];
  }): WorkflowReportedFinding {
    return {
      id: randomUUID(),
      workflowRunId: input.runId,
      type: this.classifyAttackMapFinding(input),
      title: input.title,
      severity: input.severity,
      confidence: this.severityConfidence(input.severity),
      validationStatus: "unverified",
      target: {
        host: input.target.host,
        ...(input.target.port === undefined ? {} : { port: input.target.port }),
        url: input.target.baseUrl
      },
      evidence: input.evidence,
      impact: input.description,
      recommendation: `Investigate and remediate the attack path associated with "${input.title}" before additional chaining increases impact.`,
      derivedFromFindingIds: [],
      relatedFindingIds: [],
      enablesFindingIds: [],
      ...(input.toolCommandPreview
        ? {
            reproduction: {
              commandPreview: input.toolCommandPreview,
              steps: [
                `Review the evidence gathered for ${input.title}.`,
                "Re-run the captured tool command against the same in-scope target.",
                "Confirm that the observed behavior is still reproducible."
              ]
            }
          }
        : {}),
      tags: input.tags ?? ["attack-map", "workflow-orchestrator"],
      createdAt: new Date().toISOString()
    };
  }

  private async ensureWorkflowScan(scan: Scan, targetId: string, agentId: string) {
    const existing = await getScan(scan.id);
    if (existing) {
      return existing;
    }

    await createScan(scan, {
      mode: "workflow",
      applicationId: targetId,
      agentId
    });

    return scan;
  }

  private async loadRunContext(runId: string) {
    const run = await this.ports.workflowsRepository.getRunById(runId);
    if (!run) {
      throw new RequestError(404, "Workflow run not found.");
    }

    const workflow = await this.ports.workflowsRepository.getById(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    return { run, workflow };
  }

  private async loadAgents(workflow: Workflow) {
    const uniqueAgentIds = [...new Set(workflow.stages.map((stage) => stage.agentId))];
    const agents = await Promise.all(uniqueAgentIds.map(async (agentId) => this.ports.aiAgentsRepository.getById(agentId)));
    return agents.filter((agent): agent is NonNullable<typeof agent> => Boolean(agent));
  }

  private async loadTools(
    workflow: Workflow,
    agents: Awaited<ReturnType<WorkflowRuntimeService["loadAgents"]>>
  ) {
    const toolIds = new Set<string>();
    for (const stage of workflow.stages) {
      for (const toolId of stage.allowedToolIds ?? []) {
        toolIds.add(toolId);
      }
    }
    for (const toolId of workflow.allowedToolIds ?? []) {
      toolIds.add(toolId);
    }
    for (const agent of agents) {
      for (const toolId of agent.toolIds) {
        toolIds.add(toolId);
      }
    }

    const tools = await Promise.all([...toolIds].map(async (toolId) => this.ports.aiToolsRepository.getById(toolId)));
    return tools.filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
  }
}

class DefaultWorkflowKindHandler implements WorkflowKindHandler {
  readonly kind = "workflow" as const;

  constructor(
    private readonly runtime: WorkflowRuntimeService,
    private readonly stageRunner: WorkflowStageRunner
  ) {}

  async execute(context: RuntimeStartContext): Promise<void> {
    const stages = this.runtime.getOrderedStages(context.workflow);
    let currentRun = context.run;

    for (const [index, stage] of stages.entries()) {
      currentRun = await this.runtime.appendEvent(
        currentRun,
        this.runtime.createEvent(
          currentRun,
          context.workflow.id,
          stage.id,
          currentRun.events.length,
          "stage_started",
          "running",
          { stageLabel: stage.label },
          `Stage started: ${stage.label}`,
          `Started ${stage.label}.`
        ),
        { currentStepIndex: index }
      );

      try {
        const outcome = await this.stageRunner.run({
          ...context,
          run: currentRun,
          stage
        });
        currentRun = outcome.run;

        if (outcome.result.status !== "completed") {
          currentRun = await this.runtime.appendEvent(
            currentRun,
            this.runtime.createEvent(
              currentRun,
              context.workflow.id,
              stage.id,
              currentRun.events.length,
              "stage_failed",
              "failed",
              { stageResult: outcome.result, stageLabel: stage.label },
              `Stage failed: ${stage.label}`,
              outcome.result.summary,
              outcome.result.residualRisk
            )
          );
          currentRun = await this.runtime.appendEvent(
            currentRun,
            this.runtime.createEvent(
              currentRun,
              context.workflow.id,
              stage.id,
              currentRun.events.length,
              "run_failed",
              "failed",
              {
                title: "Pipeline failed",
                summary: outcome.result.summary,
                body: outcome.result.residualRisk,
                reason: outcome.result.recommendedNextStep
              },
              "Pipeline failed",
              outcome.result.summary,
              outcome.result.residualRisk
            ),
            {
              status: "failed",
              completedAt: new Date().toISOString()
            }
          );
          await this.runtime.createExecutionReport(currentRun.id);
          return;
        }

        currentRun = await this.runtime.appendEvent(
          currentRun,
          this.runtime.createEvent(
            currentRun,
            context.workflow.id,
            stage.id,
            currentRun.events.length,
            "stage_completed",
            "completed",
            { stageResult: outcome.result, stageLabel: stage.label },
            `Stage completed: ${stage.label}`,
            outcome.result.summary,
            outcome.result.residualRisk
          ),
          index === stages.length - 1 ? undefined : { currentStepIndex: index + 1 }
        );

        if (index === stages.length - 1) {
          currentRun = await this.runtime.appendEvent(
            currentRun,
            this.runtime.createEvent(
              currentRun,
              context.workflow.id,
              stage.id,
              currentRun.events.length,
              "run_completed",
              "completed",
              {
                title: "Pipeline completed",
                summary: outcome.result.summary,
                body: outcome.result.residualRisk,
                recommendedNextStep: outcome.result.recommendedNextStep,
                residualRisk: outcome.result.residualRisk
              },
              "Pipeline completed",
              outcome.result.summary,
              outcome.result.residualRisk
            ),
            {
              status: "completed",
              completedAt: new Date().toISOString()
            }
          );
          await this.runtime.createExecutionReport(currentRun.id);
        }
      } catch (error) {
        await this.runtime.failRunWithStageError(currentRun, context.workflow.id, stage, error);
        return;
      }
    }
  }
}

class DefaultWorkflowStageRunner implements WorkflowStageRunner {
  constructor(private readonly runtime: WorkflowRuntimeService) {}

  run(context: WorkflowStageExecutionContext): Promise<WorkflowStageExecutionOutcome> {
    return this.runtime.executeWorkflowStage(context);
  }
}

class AttackMapWorkflowKindHandler implements WorkflowKindHandler {
  readonly kind = "attack-map" as const;

  constructor(private readonly runtime: WorkflowRuntimeService) {}

  execute(context: RuntimeStartContext): Promise<void> {
    return this.runtime.executeAttackMapWorkflowRun(context);
  }
}
