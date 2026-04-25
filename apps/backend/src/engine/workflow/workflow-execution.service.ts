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
  WorkflowTraceEvent
} from "@synosec/contracts";
import { getWorkflowReportedFindings, workflowFindingSubmissionSchema } from "@synosec/contracts";
import { z } from "zod";
import type { WorkflowRunStream } from "@/engine/workflow/workflow-run-stream.js";
import { RequestError } from "@/shared/http/request-error.js";
import { compileToolRequestFromDefinition } from "@/modules/ai-tools/index.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiProvidersRepository, StoredAiProvider } from "@/modules/ai-providers/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { ApplicationsRepository } from "@/modules/applications/index.js";
import type { RuntimesRepository } from "@/modules/runtimes/index.js";
import { createScan, getEnvironmentGraphForScan, getScan } from "@/engine/scans/index.js";
import { buildScopeFromTargetAssets } from "@/engine/scans/environment-graph.js";
import type { AttackMapNode, AttackPlan, AttackPlanPhase } from "@/engine/orchestrator/orchestrator-stream.js";
import type { OrchestratorExecutionEngineService } from "@/engine/orchestrator/index.js";
import { enrichAttackTechnique } from "@/engine/findings/attack-technique-mapper.js";
import { inferCrossHostLateralRoutes } from "@/engine/findings/cross-host-lateral-routes.js";
import { ToolBroker } from "./broker/tool-broker.js";
import {
  authorizeToolAgainstConstraints,
  resolveEffectiveExecutionConstraints,
  resolveTargetAsset,
  type EffectiveExecutionConstraintSet
} from "./execution-constraints.js";
import {
  inferLayer,
  normalizeToolInput,
  parseExecutionTarget,
  truncate,
  enrichWorkflowFindingDetails,
  verifyFindingEvidence,
  type ExecutedToolResult
} from "./workflow-execution.utils.js";
import { WorkflowRunEventPublisher } from "./workflow-run-event-publisher.js";
import type { WorkflowsRepository } from "@/modules/workflows/workflows.repository.js";

type PipelineTerminalState =
  | {
      status: "completed";
      summary: string;
      recommendedNextStep: string;
      residualRisk: string;
    }
  | {
      status: "failed";
      reason: string;
      summary?: string;
    };

type PipelineContext = {
  workflow: Workflow;
  run: WorkflowRun;
  application: NonNullable<Awaited<ReturnType<ApplicationsRepository["getById"]>>>;
  runtime: Awaited<ReturnType<RuntimesRepository["getById"]>>;
  agent: NonNullable<Awaited<ReturnType<AiAgentsRepository["getById"]>>>;
  provider: StoredAiProvider;
  target: { baseUrl: string; host: string; port?: number };
  constraintSet: EffectiveExecutionConstraintSet;
  tools: AiTool[];
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
  | "stage_failed";

function createWorkflowScan(
  run: WorkflowRun,
  constraints: EffectiveExecutionConstraintSet,
  application: NonNullable<Awaited<ReturnType<ApplicationsRepository["getById"]>>>
): Scan {
  const scope = buildScopeFromTargetAssets({
    environmentName: application.name,
    defaultHost: constraints.normalizedTarget.host,
    targetAssets: (application.targetAssets ?? []).map((asset) => ({
      label: asset.label,
      hostname: asset.hostname,
      baseUrl: asset.baseUrl,
      ipAddress: asset.ipAddress,
      cidr: asset.cidr,
      metadata: asset.metadata as Record<string, unknown> | null
    })),
    exclusions: constraints.excludedPaths,
    rateLimitRps: constraints.rateLimitRps,
    allowActiveExploit: constraints.allowActiveExploit
  });

  return {
    id: run.id,
    scope,
    status: "running",
    currentRound: 0,
    tacticsTotal: Math.max(scope.targets.length, 1),
    tacticsComplete: 0,
    createdAt: run.startedAt
  };
}

export class WorkflowExecutionService {
  private readonly broker: ToolBroker;
  private readonly eventPublisher: WorkflowRunEventPublisher;

  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly runtimesRepository: RuntimesRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    private readonly aiProvidersRepository: AiProvidersRepository,
    private readonly aiToolsRepository: AiToolsRepository,
    private readonly workflowRunStream: WorkflowRunStream,
    private readonly orchestratorExecutionEngine: OrchestratorExecutionEngineService,
    private readonly executionReportsService: ExecutionReportsService = new ExecutionReportsService()
  ) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
    this.eventPublisher = new WorkflowRunEventPublisher(this.workflowsRepository, this.workflowRunStream);
  }

  async startRun(workflowId: string, input: StartWorkflowRunBody = { coordinateEnvironment: false }) {
    const workflow = await this.workflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const application = await this.applicationsRepository.getById(workflow.applicationId);
    if (!application) {
      throw new RequestError(400, "Workflow application not found.");
    }

    const agent = await this.aiAgentsRepository.getById(workflow.agentId);
    if (!agent) {
      throw new RequestError(400, "Workflow agent not found.");
    }

    const provider = await this.aiProvidersRepository.getStoredById(agent.providerId);
    if (workflow.executionKind === "attack-map") {
      this.assertProviderSupportsAttackMapWorkflowExecution(provider);
    } else {
      this.assertProviderSupportsWorkflowExecution(provider);
    }

    const targetAsset = input.coordinateEnvironment && !input.targetAssetId
      ? application.targetAssets?.find((asset) => asset.isDefault) ?? application.targetAssets?.[0] ?? resolveTargetAsset(application, input.targetAssetId)
      : resolveTargetAsset(application, input.targetAssetId);
    const constraintSet = resolveEffectiveExecutionConstraints(application, targetAsset, 5);
    const coordinatedTargetPlans = input.coordinateEnvironment && !input.targetAssetId
      ? (application.targetAssets ?? [])
          .filter((asset) => asset.id !== targetAsset.id)
          .slice(0, 20)
          .map((asset) => ({
            targetAsset: asset,
            constraintSet: resolveEffectiveExecutionConstraints(application, asset, 5)
          }))
      : [];

    const run = await this.workflowsRepository.createRun(workflowId, targetAsset.id);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    this.eventPublisher.publishSnapshot(run);
    const execution = workflow.executionKind === "attack-map"
      ? this.executeAttackMapWorkflowRun(workflow, run, application, agent, provider, constraintSet)
      : this.executePipelineRun(workflow, run, application, agent, provider, constraintSet);
    void execution.catch(async (error) => {
      await this.failWorkflowRunAfterUnhandledError(run.id, error);
    });

    if (input.coordinateEnvironment && !input.targetAssetId) {
      const childRunIds: string[] = [];
      for (const plan of coordinatedTargetPlans) {
        const siblingRun = await this.workflowsRepository.createRun(workflowId, plan.targetAsset.id);
        if (!siblingRun) {
          throw new RequestError(404, "Workflow not found.");
        }
        childRunIds.push(siblingRun.id);
        this.eventPublisher.publishSnapshot(siblingRun);
        const siblingExecution = workflow.executionKind === "attack-map"
          ? this.executeAttackMapWorkflowRun(workflow, siblingRun, application, agent, provider, plan.constraintSet)
          : this.executePipelineRun(workflow, siblingRun, application, agent, provider, plan.constraintSet);
        void siblingExecution.catch(async (error) => {
          await this.failWorkflowRunAfterUnhandledError(siblingRun.id, error);
        });
      }

      if (childRunIds.length > 0) {
        const updatedRun = await this.eventPublisher.appendEvent(
          run,
          this.createEvent(
            run,
            workflow.id,
            run.events.length,
            "model_decision",
            "completed",
            {
              title: "Environment workflow fan-out started",
              summary: `Started ${childRunIds.length} additional workflow run(s) for registered environment targets.`,
              childRunIds,
              primaryRunId: run.id
            },
            "Environment workflow fan-out started",
            `Started ${childRunIds.length} additional workflow run(s) for registered environment targets.`,
            childRunIds.map((id) => `- ${id}`).join("\n")
          )
        );
        this.eventPublisher.publishSnapshot(updatedRun);
      }
    }

    return run;
  }

  async stepRun(_runId: string) {
    throw new RequestError(400, "Pipeline runs advance automatically after start.");
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

  private async failWorkflowRunAfterUnhandledError(runId: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);

    try {
      const failedRun = await this.workflowsRepository.updateRunState(runId, {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      this.eventPublisher.publishSnapshot(failedRun);
      await this.executionReportsService.createForWorkflowRun(runId);
    } catch (updateError) {
      console.error("Failed to persist workflow run failure state.", updateError);
    }

    console.error("Unhandled workflow pipeline execution failure.", detail);
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
    const enrichment = enrichAttackTechnique({
      technique: input.vector,
      title: input.title,
      description: input.description,
      tags: input.tags ?? ["attack-map", "workflow-orchestrator"]
    });
    const detail = enrichWorkflowFindingDetails({
      title: input.title,
      target: {
        host: input.target.host,
        ...(input.target.port === undefined ? {} : { port: input.target.port }),
        url: input.target.baseUrl
      },
      evidence: input.evidence,
      ...(input.toolCommandPreview ? { reproduction: { commandPreview: input.toolCommandPreview, steps: [] } } : {})
    }, [], input.target);

    return {
      id: randomUUID(),
      workflowRunId: input.runId,
      type: this.classifyAttackMapFinding(input),
      title: input.title,
      severity: input.severity,
      confidence: this.severityConfidence(input.severity),
      target: {
        ...detail.target
      },
      evidence: input.evidence,
      impact: input.description,
      recommendation: `Investigate and remediate the attack path associated with "${input.title}" before additional chaining increases impact.`,
      validationStatus: "single_source",
      ...(enrichment.cwe ? { cwe: enrichment.cwe } : {}),
      ...(enrichment.mitreId ? { mitreId: enrichment.mitreId } : {}),
      reproduction: detail.reproduction,
      tags: enrichment.tags,
      createdAt: new Date().toISOString()
    };
  }

  private buildSystemPrompt(input: PipelineContext) {
    return [
      input.agent.systemPrompt,
      "Report concrete findings with report_finding.",
      "Use complete_run or fail_run to stop.",
      "Emit short plain-text progress updates before tool bursts and closeout."
    ].join("\n\n");
  }

  private buildTaskPrompt(input: PipelineContext) {
    return [
      `Workflow: ${input.workflow.name}`,
      `Application: ${input.application.name}`,
      `Target URL: ${input.target.baseUrl}`,
      input.runtime ? `Runtime: ${input.runtime.name} (${input.runtime.provider}, ${input.runtime.region})` : null
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
      case "run_completed":
        return "stage_completed";
      case "run_failed":
        return "stage_failed";
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

  private async ensureWorkflowScan(scan: Scan, context: PipelineContext) {
    const existing = await getScan(scan.id);
    if (existing) {
      return existing;
    }

    await createScan(scan, {
      mode: "workflow",
      applicationId: context.application.id,
      runtimeId: context.runtime?.id ?? null,
      agentId: context.agent.id
    });

    return scan;
  }

  private createEvent(
    run: WorkflowRun,
    workflowId: string,
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
      workflowStageId: null,
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

  private async executeAttackMapWorkflowRun(
    workflow: Workflow,
    run: WorkflowRun,
    application: NonNullable<Awaited<ReturnType<ApplicationsRepository["getById"]>>>,
    agent: NonNullable<Awaited<ReturnType<AiAgentsRepository["getById"]>>>,
    provider: StoredAiProvider,
    constraintSet: EffectiveExecutionConstraintSet
  ) {
    const orchestrator = this.orchestratorExecutionEngine as unknown as {
      listOrchestratorRunnableTools: () => Promise<Array<AiTool>>;
      runRecon: (
        targetUrl: string,
        runId: string,
        provider: StoredAiProvider,
        model: string,
        emitReasoning: (phase: string, title: string, summary: string) => void
      ) => Promise<{
        openPorts: { port: number; protocol: string; service: string; version: string }[];
        technologies: string[];
        httpHeaders: Record<string, string>;
        serverInfo: { os?: string; webServer?: string; cms?: string };
        interestingPaths: string[];
        probes: Array<{
          toolName: string;
          command: string;
          output: string;
          status: "completed" | "failed";
        }>;
        rawNmap: string;
        rawCurl: string;
      }>;
      createPlan: (
        targetUrl: string,
        recon: {
          openPorts: { port: number; protocol: string; service: string; version: string }[];
          technologies: string[];
          httpHeaders: Record<string, string>;
          serverInfo: { os?: string; webServer?: string; cms?: string };
          interestingPaths: string[];
          probes: Array<{
            toolName: string;
            command: string;
            output: string;
            status: "completed" | "failed";
          }>;
          rawNmap: string;
          rawCurl: string;
        },
        plannerTools: Array<AiTool>,
        provider: StoredAiProvider,
        model: string,
        emitReasoning: (phase: string, title: string, summary: string) => void
      ) => Promise<{ phases: AttackPlanPhase[]; overallRisk: "critical" | "high" | "medium" | "low"; summary: string }>;
      executePhase: (
        targetUrl: string,
        phase: AttackPlanPhase,
        recon: {
          openPorts: { port: number; protocol: string; service: string; version: string }[];
          technologies: string[];
          httpHeaders: Record<string, string>;
          serverInfo: { os?: string; webServer?: string; cms?: string };
          interestingPaths: string[];
          probes: Array<{
            toolName: string;
            command: string;
            output: string;
            status: "completed" | "failed";
          }>;
          rawNmap: string;
          rawCurl: string;
        },
        runId: string,
        provider: StoredAiProvider,
        model: string,
        emitReasoning: (phase: string, title: string, summary: string) => void,
        recordToolActivity: (activity: Record<string, unknown>) => Promise<void>,
        updateToolActivity: (id: string, patch: Record<string, unknown>) => Promise<void>
      ) => Promise<{
        findings: { title: string; severity: string; description: string; vector: string; rawEvidence?: string }[];
        probeCommand: string;
        probeOutput: string;
        toolAttempts: Array<{ toolRunId: string; toolId: string; toolName: string; commandPreview: string; output: string }>;
      }>;
      adaptAttackPlan: (
        targetUrl: string,
        currentPlan: AttackPlan,
        completedPhase: AttackPlanPhase,
        phaseFindings: { title: string; severity: string; description: string; vector: string; rawEvidence?: string }[],
        confirmedFindings: { title: string; severity: string; description: string; vector: string }[],
        recon: {
          openPorts: { port: number; protocol: string; service: string; version: string }[];
          technologies: string[];
          httpHeaders: Record<string, string>;
          serverInfo: { os?: string; webServer?: string; cms?: string };
          interestingPaths: string[];
          probes: Array<{
            toolName: string;
            command: string;
            output: string;
            status: "completed" | "failed";
          }>;
          rawNmap: string;
          rawCurl: string;
        },
        plannerTools: Array<AiTool>,
        provider: StoredAiProvider,
        model: string,
        emitReasoning: (phase: string, title: string, summary: string) => void
      ) => Promise<AttackPlan>;
      deepDiveFinding: (
        targetUrl: string,
        finding: AttackMapNode,
        siblingFindings: AttackMapNode[],
        recon: {
          openPorts: { port: number; protocol: string; service: string; version: string }[];
          technologies: string[];
          httpHeaders: Record<string, string>;
          serverInfo: { os?: string; webServer?: string; cms?: string };
          interestingPaths: string[];
          probes: Array<{
            toolName: string;
            command: string;
            output: string;
            status: "completed" | "failed";
          }>;
          rawNmap: string;
          rawCurl: string;
        },
        provider: StoredAiProvider,
        model: string,
        emitReasoning: (phase: string, title: string, summary: string) => void
      ) => Promise<AttackMapNode[]>;
      correlateAttackChains: (
        allFindings: AttackMapNode[],
        targetUrl: string,
        provider: StoredAiProvider,
        model: string,
        emitReasoning: (phase: string, title: string, summary: string) => void
      ) => Promise<Array<{ title: string; description: string; severity: WorkflowReportedFinding["severity"]; findingIds: string[]; exploitation: string; impact: string }>>;
    };

    const target = {
      baseUrl: constraintSet.normalizedTarget.baseUrl ?? application.baseUrl ?? `http://${constraintSet.normalizedTarget.host}`,
      host: constraintSet.normalizedTarget.host,
      ...(constraintSet.normalizedTarget.port === undefined ? {} : { port: constraintSet.normalizedTarget.port })
    };
    const plannerTools = (
      await Promise.all(workflow.allowedToolIds.map((toolId) => this.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

    let currentRun = run;
    let ord = currentRun.events.length;
    const appendEvent = async (
      type: WorkflowTraceEvent["type"],
      status: WorkflowTraceEvent["status"],
      payload: Record<string, unknown>,
      title: string,
      summary: string,
      detail?: string | null,
      patch?: { status?: WorkflowRun["status"]; completedAt?: string | null },
      options?: {
        rawStreamPartType?: string;
        liveModelOutput?: WorkflowLiveModelOutput | null;
      }
    ) => {
      currentRun = await this.eventPublisher.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflow.id, ord++, type, status, payload, title, summary, detail, options?.rawStreamPartType),
        patch,
        options?.liveModelOutput
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
    const plannerToolContext = this.formatToolContextSections([
      {
        title: "Planner-visible tools",
        tools: plannerTools.map((tool) => ({
          name: tool.name,
          description: tool.description
        }))
      }
    ]);

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

    const attackMapScan = createWorkflowScan(currentRun, constraintSet, application);
    const existingAttackMapScan = await getScan(attackMapScan.id);
    if (!existingAttackMapScan) {
      await createScan(attackMapScan, {
        mode: "workflow",
        applicationId: application.id,
        runtimeId: workflow.runtimeId,
        agentId: agent.id
      });
    }
    const environmentGraph = await getEnvironmentGraphForScan(attackMapScan.id);
    if (environmentGraph) {
      await appendEvent(
        "system_message",
        "completed",
        {
          title: "Environment graph initialized",
          summary: `Mapped ${environmentGraph.nodes.length} asset node(s) and ${environmentGraph.edges.length} edge(s) before attack planning.`,
          graph: environmentGraph,
          targetCount: attackMapScan.scope.targets.length,
          coordinatedTargets: attackMapScan.scope.targets
        },
        "Environment graph initialized",
        `Mapped ${environmentGraph.nodes.length} asset node(s) and ${environmentGraph.edges.length} edge(s) before attack planning.`,
        JSON.stringify(environmentGraph, null, 2)
      );
    }
    if (attackMapScan.scope.targets.length > 1) {
      await appendEvent(
        "model_decision",
        "completed",
        {
          title: "Multi-host coordination plan",
          summary: `This environment has ${attackMapScan.scope.targets.length} in-scope target(s). The current run analyzes ${target.host} and records the shared graph for follow-up host workflows.`,
          primaryTarget: target.host,
          inScopeTargets: attackMapScan.scope.targets
        },
        "Multi-host coordination plan",
        `Prepared shared attack-map context for ${attackMapScan.scope.targets.length} in-scope target(s).`,
        attackMapScan.scope.targets.map((candidate) => `- ${candidate}`).join("\n")
      );
    }

    const recon = await orchestrator.runRecon(target.baseUrl, run.id, provider, provider.model, (phase, title, summary) => {
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

    let plan = await orchestrator.createPlan(target.baseUrl, recon, plannerTools, provider, provider.model, (phase, title, summary) => {
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
    const confirmedFindings: { title: string; severity: string; description: string; vector: string }[] = [];
    let executedPhaseCount = 0;
    while (executedPhaseCount < 3) {
      const phase = plan.phases.find((candidate) => candidate.status === "pending");
      if (!phase) {
        break;
      }
      phase.status = "running";
      const result = await orchestrator.executePhase(
        target.baseUrl,
        phase,
        recon,
        run.id,
        provider,
        provider.model,
        (reasonPhase, title, summary) => {
          void emitReasoning(reasonPhase, title, summary);
        },
        recordToolActivity,
        updateToolActivity
      );
      phase.status = "completed";
      executedPhaseCount++;

      for (const finding of result.findings) {
        confirmedFindings.push({
          title: finding.title,
          severity: finding.severity,
          description: finding.description,
          vector: finding.vector
        });
        const severity = (["critical", "high", "medium", "low", "info"].includes(finding.severity) ? finding.severity : "medium") as WorkflowReportedFinding["severity"];
        const workflowFinding = this.createAttackMapWorkflowFinding({
          runId: currentRun.id,
          target,
          title: finding.title,
          severity,
          description: finding.description,
          vector: finding.vector,
          evidence: result.toolAttempts.length > 0
            ? result.toolAttempts.slice(0, 3).map((attempt) => ({
                sourceTool: attempt.toolName,
                quote: (finding.rawEvidence ?? attempt.output).slice(0, 600),
                artifactRef: attempt.toolRunId
              }))
            : [{
                sourceTool: phase.name,
                quote: (finding.rawEvidence ?? finding.description).slice(0, 600)
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

      plan = await orchestrator.adaptAttackPlan(
        target.baseUrl,
        plan,
        phase,
        result.findings,
        confirmedFindings,
        recon,
        plannerTools,
        provider,
        provider.model,
        (reasonPhase, title, summary) => {
          void emitReasoning(reasonPhase, title, summary);
        }
      );
      await appendEvent(
        "model_decision",
        "completed",
        {
          title: "Attack plan adapted",
          summary: plan.summary,
          body: JSON.stringify(plan, null, 2),
          phase: "planning",
          plan
        },
        "Attack plan adapted",
        plan.summary,
        JSON.stringify(plan, null, 2)
      );
    }

    for (const finding of findingNodes.filter((node) => node.severity === "critical" || node.severity === "high" || node.severity === "medium").slice(0, 4)) {
      const deepFindings = await orchestrator.deepDiveFinding(
        target.baseUrl,
        finding,
        findingNodes,
        recon,
        provider,
        provider.model,
        (phase, title, summary) => {
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
            quote: String(child.data["description"] ?? child.label).slice(0, 600)
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
      ? await orchestrator.correlateAttackChains(findingNodes, target.baseUrl, provider, provider.model, (phase, title, summary) => {
          void emitReasoning(phase, title, summary);
        })
      : [];
    const reportedWorkflowFindings = getWorkflowReportedFindings(currentRun);
    const crossHostRoutes = inferCrossHostLateralRoutes(currentRun.id, reportedWorkflowFindings);
    for (const route of crossHostRoutes) {
      await appendEvent(
        "model_decision",
        "completed",
        { route, phase: "cross_host_correlation" },
        `Cross-host route detected: ${route.title}`,
        route.narrative ?? route.title,
        JSON.stringify(route, null, 2)
      );
    }
    const closeoutSummary = `Attack-map workflow completed. ${plan.phases.length} phases planned, ${reportedWorkflowFindings.length} findings reported, ${chains.length + crossHostRoutes.length} attack chains identified.`;
    await appendEvent(
      "run_completed",
      "completed",
      {
        title: "Attack-map workflow completed",
        summary: closeoutSummary,
        body: plan.summary,
        overallRisk: plan.overallRisk,
        chainCount: chains.length + crossHostRoutes.length,
        crossHostRouteCount: crossHostRoutes.length,
        crossHostRoutes,
        findingNodeCount: reportedWorkflowFindings.length,
        recommendedNextStep: "Investigate the highest-severity workflow findings and validate the reported attack paths.",
        residualRisk: `Overall attack-map risk remains ${plan.overallRisk}.`
      },
      "Attack-map workflow completed",
      closeoutSummary,
      plan.summary,
      {
        status: "completed",
        completedAt: new Date().toISOString()
      }
    );
  }

  private async executePipelineRun(
    workflow: Workflow,
    run: WorkflowRun,
    applicationOverride?: NonNullable<Awaited<ReturnType<ApplicationsRepository["getById"]>>>,
    agentOverride?: NonNullable<Awaited<ReturnType<AiAgentsRepository["getById"]>>>,
    providerOverride?: StoredAiProvider,
    constraintSetOverride?: EffectiveExecutionConstraintSet
  ) {
    const [application, runtime, agent] = await Promise.all([
      applicationOverride ? Promise.resolve(applicationOverride) : this.applicationsRepository.getById(workflow.applicationId),
      workflow.runtimeId ? this.runtimesRepository.getById(workflow.runtimeId) : Promise.resolve(null),
      agentOverride ? Promise.resolve(agentOverride) : this.aiAgentsRepository.getById(workflow.agentId)
    ]);

    if (!application) {
      throw new RequestError(400, "Workflow application not found.");
    }
    if (!agent) {
      throw new RequestError(400, "Workflow agent not found.");
    }

    const provider = providerOverride ?? await this.aiProvidersRepository.getStoredById(agent.providerId);
    this.assertProviderSupportsWorkflowExecution(provider);
    const targetAsset = resolveTargetAsset(application, run.targetAssetId ?? undefined);
    const constraintSet = constraintSetOverride ?? resolveEffectiveExecutionConstraints(application, targetAsset, 5);
    const target = {
      baseUrl: constraintSet.normalizedTarget.baseUrl ?? application.baseUrl ?? `http://${constraintSet.normalizedTarget.host}`,
      host: constraintSet.normalizedTarget.host,
      ...(constraintSet.normalizedTarget.port === undefined ? {} : { port: constraintSet.normalizedTarget.port })
    };
    const tools = (
      await Promise.all(workflow.allowedToolIds.map((toolId) => this.aiToolsRepository.getById(toolId)))
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
        sandboxProfile: tool.sandboxProfile,
        privilegeProfile: tool.privilegeProfile,
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
        throw new RequestError(400, `Workflow cannot start because ${incompatibleTool.name} is not compatible with the active application constraints.`, {
          code: "WORKFLOW_TOOL_CONSTRAINT_INCOMPATIBLE",
          userFriendlyMessage: `Workflow cannot start because ${incompatibleTool.name} cannot enforce the active target policy.`
        });
      }
    }

    const context: PipelineContext = {
      workflow,
      run,
      application,
      runtime,
      agent,
      provider,
      target,
      constraintSet,
      tools
    };

    let currentRun = run;
    let ord = currentRun.events.length;
    const appendEvent = async (
      type: WorkflowTraceEvent["type"],
      status: WorkflowTraceEvent["status"],
      payload: Record<string, unknown>,
      title: string,
      summary: string,
      detail?: string | null,
      patch?: { status?: WorkflowRun["status"]; completedAt?: string | null },
      options?: {
        rawStreamPartType?: string;
        liveModelOutput?: WorkflowLiveModelOutput | null;
      }
    ) => {
      currentRun = await this.eventPublisher.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflow.id, ord++, type, status, payload, title, summary, detail, options?.rawStreamPartType),
        patch,
        options?.liveModelOutput
      );
      return currentRun;
    };

    const systemPrompt = this.buildSystemPrompt(context);
    const taskPrompt = this.buildTaskPrompt(context);
    const toolContext = this.formatToolContextSections([
      {
        title: "Evidence tools",
        tools: context.tools
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
            name: "report_finding",
            description: "Persist one evidence-backed workflow finding."
          },
          {
            name: "complete_run",
            description: "Finish the workflow pipeline successfully."
          },
          {
            name: "fail_run",
            description: "Finish the workflow pipeline as failed."
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

    const scan = createWorkflowScan(run, constraintSet, context.application);
    await this.ensureWorkflowScan(scan, context);
    const environmentGraph = await getEnvironmentGraphForScan(scan.id);
    if (environmentGraph) {
      await appendEvent("system_message", "completed", {
        title: "Environment graph initialized",
        summary: `Mapped ${environmentGraph.nodes.length} asset node(s) and ${environmentGraph.edges.length} edge(s) for ${environmentGraph.environmentName ?? "this environment"}.`,
        graph: environmentGraph,
        targetCount: scan.scope.targets.length
      }, "Environment graph initialized", `Mapped ${environmentGraph.nodes.length} asset node(s) and ${environmentGraph.edges.length} edge(s).`, JSON.stringify(environmentGraph, null, 2));
    }
    const executedResults: ExecutedToolResult[] = [];
    const reportedFindings = new Map<string, WorkflowReportedFinding>();
    let terminalState: PipelineTerminalState | null = null;
    let liveModelOutput: WorkflowLiveModelOutput | null = null;
    const abortController = new AbortController();
    const liveOutputSource: WorkflowLiveModelOutput["source"] = provider.kind === "local" ? "local" : "hosted";

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

    const bashTools = context.tools.filter((tool) => tool.executorType === "bash" && Boolean(tool.bashSource));
    const evidenceTools = Object.fromEntries(bashTools.map((tool) => [
      tool.id,
      createSdkTool({
        description: tool.description ?? tool.name,
        inputSchema: z.object({}).catchall(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
        execute: async (rawInput) => {
          const toolInput = normalizeToolInput(rawInput);
          const executionTarget = parseExecutionTarget(toolInput, context.target);
          const request = compileToolRequestFromDefinition(tool, {
            target: executionTarget.target,
            ...(executionTarget.port === undefined ? {} : { port: executionTarget.port }),
            layer: inferLayer(tool.category),
            justification: `Evidence collection for workflow ${context.workflow.name}.`,
            toolInput
          });
          const brokerResult = await this.broker.executeRequests({
            scan,
            tacticId: context.workflow.id,
            agentId: context.agent.id,
            requests: [request],
            constraintSet: context.constraintSet,
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
      report_finding: createSdkTool({
        description: "Persist one evidence-backed workflow finding.",
        inputSchema: workflowFindingSubmissionSchema,
        execute: async (rawInput) => {
          const findingInput = workflowFindingSubmissionSchema.parse(rawInput);
          const verification = verifyFindingEvidence(findingInput, executedResults);
          const enrichment = enrichAttackTechnique({
            technique: findingInput.type,
            title: findingInput.title,
            description: findingInput.impact,
            ...(findingInput.cwe ? { existingCwe: findingInput.cwe } : {}),
            ...(findingInput.mitreId ? { existingMitreId: findingInput.mitreId } : {}),
            tags: findingInput.tags
          });

          await appendEvent("verification", verification.validationStatus === "rejected" ? "failed" : "completed", {
            title: "Evidence Verification",
            status: verification.validationStatus,
            confidence: verification.confidence,
            reason: verification.reason
          }, "Evidence Verification", verification.reason);

          if (verification.validationStatus === "rejected") {
            return {
              accepted: false,
              reason: verification.reason,
              validationStatus: verification.validationStatus
            };
          }

          const detail = enrichWorkflowFindingDetails(findingInput, executedResults, context.target);
          const finding: WorkflowReportedFinding = {
            id: randomUUID(),
            workflowRunId: currentRun.id,
            createdAt: new Date().toISOString(),
            ...findingInput,
            target: detail.target,
            reproduction: detail.reproduction,
            ...(enrichment.cwe ? { cwe: enrichment.cwe } : {}),
            ...(enrichment.mitreId ? { mitreId: enrichment.mitreId } : {}),
            tags: enrichment.tags,
            validationStatus: verification.validationStatus,
            confidence: verification.confidence
          };
          reportedFindings.set(finding.id, finding);
          await appendEvent("finding_reported", "completed", {
            finding
          }, `Finding reported: ${finding.title}`, `${finding.severity.toUpperCase()} ${finding.type} on ${finding.target.host}.`, finding.impact);
          return {
            accepted: true,
            findingId: finding.id,
            title: finding.title,
            severity: finding.severity,
            validationStatus: finding.validationStatus,
            confidence: finding.confidence
          };
        }
      }),
      complete_run: createSdkTool({
        description: "Finish the workflow pipeline successfully.",
        inputSchema: z.object({
          summary: z.string().min(1),
          recommendedNextStep: z.string().min(1),
          residualRisk: z.string().min(1)
        }),
        execute: async (rawInput) => {
          const completion = z.object({
            summary: z.string().min(1),
            recommendedNextStep: z.string().min(1),
            residualRisk: z.string().min(1)
          }).parse(rawInput);
          terminalState = {
            status: "completed",
            ...completion
          };
          await appendEvent("run_completed", "completed", {
            title: "Pipeline completed",
            summary: completion.summary,
            body: completion.residualRisk,
            recommendedNextStep: completion.recommendedNextStep,
            residualRisk: completion.residualRisk
          }, "Pipeline completed", completion.summary, completion.residualRisk, {
            status: "completed",
            completedAt: new Date().toISOString()
          });
          await this.executionReportsService.createForWorkflowRun(currentRun.id);
          abortController.abort("workflow-completed");
          return { accepted: true };
        }
      }),
      fail_run: createSdkTool({
        description: "Finish the workflow pipeline as failed.",
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
            ...(failure.summary ? { summary: failure.summary } : {})
          };
          await appendEvent("run_failed", "failed", {
            title: "Pipeline failed",
            summary: failure.summary ?? failure.reason,
            body: failure.reason,
            reason: failure.reason
          }, "Pipeline failed", failure.summary ?? failure.reason, failure.reason, {
            status: "failed",
            completedAt: new Date().toISOString()
          });
          await this.executionReportsService.createForWorkflowRun(currentRun.id);
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
          case "text":
            {
              const nextLiveModelOutput = appendLiveText(part.text);
            await appendEvent("model_decision", "running", {
              text: part.text
            }, "Model streamed text", truncate(part.text, 80), part.text, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: nextLiveModelOutput
            });
            }
            break;
          case "reasoning":
            {
              const nextLiveModelOutput = appendLiveReasoning(part.text);
            await appendEvent("model_decision", "running", {
              text: part.text
            }, "Model streamed reasoning", truncate(part.text, 80), part.text, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: nextLiveModelOutput
            });
            }
            break;
          case "tool-call-streaming-start":
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName
            }, `Calling ${part.toolName}`, `Started streaming arguments for ${part.toolName}.`, null, undefined, {
              rawStreamPartType: part.type
            });
            break;
          case "tool-call-delta":
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              argsTextDelta: part.argsTextDelta
            }, `Calling ${part.toolName}`, `Streaming arguments for ${part.toolName}.`, part.argsTextDelta, undefined, {
              rawStreamPartType: part.type
            });
            break;
          case "tool-call":
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
          case "finish-step":
            {
              const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
              finishReason: part.finishReason,
              rawFinishReason: part.rawFinishReason,
              usage: part.usage
            }, "Model step finished", `Step finished with reason: ${part.finishReason}.`, null, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            }
            break;
          case "finish":
            {
              const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
              finishReason: part.finishReason,
              rawFinishReason: part.rawFinishReason,
              totalUsage: part.totalUsage
            }, "Model stream finished", `Stream finished with reason: ${part.finishReason}.`, null, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            }
            break;
          case "error":
            {
              const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("verification", "failed", {
              message: part.error instanceof Error ? part.error.message : String(part.error),
              detail: part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error)
            }, "Model stream error", part.error instanceof Error ? part.error.message : String(part.error), part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error), undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            }
            break;
          case "abort":
            {
              const finalLiveModelOutput = finalizeLiveModelOutput();
            await appendEvent("verification", "completed", {
              message: typeof part.reason === "string" ? part.reason : "workflow-aborted"
            }, "Model stream aborted", typeof part.reason === "string" ? part.reason : "workflow-aborted", null, undefined, {
              rawStreamPartType: part.type,
              liveModelOutput: finalLiveModelOutput
            });
            }
            break;
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
        await this.workflowsRepository.updateRunState(currentRun.id, {
          status: "failed",
          completedAt: new Date().toISOString()
        });
        throw error;
      }
    }

    if (!terminalState) {
      await appendEvent("stage_failed", "failed", {
        title: "Pipeline failed",
        summary: "The model finished without calling complete_run or fail_run.",
        body: "The model finished without calling complete_run or fail_run.",
        reason: "The model finished without calling complete_run or fail_run."
      }, "Pipeline failed", "The model finished without calling complete_run or fail_run.", "The model finished without calling complete_run or fail_run.", {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      return;
    }

    this.eventPublisher.publishSnapshot(currentRun);
  }
}
