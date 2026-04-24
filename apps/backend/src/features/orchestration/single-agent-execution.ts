import { randomUUID } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, jsonSchema, stepCountIs, tool as createSdkTool, type LanguageModel } from "ai";
import type {
  AiTool,
  CreateSingleAgentScanRequest,
  Scan,
  ScanLayerCoverage,
  ScanLlmConfig,
  SecurityVulnerability,
  ToolRequest,
  WorkflowTraceEvent
} from "@synosec/contracts";
import {
  scanLayerCoverageSubmissionSchema,
  securityVulnerabilitySubmissionSchema,
  type SingleAgentScanCompletion
} from "@synosec/contracts";
import { z } from "zod";
import { RequestError } from "@/shared/http/request-error.js";
import {
  createAuditEntry,
  createDfsNode,
  createScan,
  createSecurityVulnerability,
  getScan,
  getSingleAgentScan,
  updateNodeStatus,
  updateSingleAgentScan,
  upsertLayerCoverage,
  selectToolsForContext,
  type ToolSelectorContext
} from "@/features/scans/index.js";
import { ToolBroker, normalizeToolInput, parseExecutionTarget, parseTarget, truncate } from "@/features/workflows/index.js";
import { compileToolRequestFromDefinition } from "@/features/ai-tools/index.js";
import type { AiAgentsRepository } from "@/features/ai-agents/index.js";
import type { AiProvidersRepository, StoredAiProvider } from "@/features/ai-providers/index.js";
import type { AiToolsRepository } from "@/features/ai-tools/index.js";
import type { ApplicationsRepository } from "@/features/applications/index.js";
import type { RuntimesRepository } from "@/features/runtimes/index.js";
import { AGENT_TOOL_POLICIES } from "@/shared/seed-data/agent-tool-policies.js";
import { resolveAgentTools } from "@/features/ai-agents/index.js";

const vulnerabilityToolInputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "primaryLayer",
    "category",
    "title",
    "description",
    "impact",
    "recommendation",
    "severity",
    "confidence",
    "target",
    "evidence",
    "technique"
  ],
  properties: {
    primaryLayer: { type: "string", enum: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] },
    relatedLayers: {
      type: "array",
      items: { type: "string", enum: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] }
    },
    category: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    impact: { type: "string" },
    recommendation: { type: "string" },
    severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    validationStatus: {
      type: "string",
      enum: ["unverified", "suspected", "single_source", "cross_validated", "reproduced", "blocked", "rejected"]
    },
    target: {
      type: "object",
      required: ["host"],
      properties: {
        host: { type: "string" },
        port: { type: "number" },
        url: { type: "string" },
        path: { type: "string" },
        service: { type: "string" }
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
          artifactRef: { type: "string" },
          observationRef: { type: "string" },
          toolRunRef: { type: "string" }
        }
      }
    },
    technique: { type: "string" },
    reproduction: {
      type: "object",
      required: ["steps"],
      properties: {
        commandPreview: { type: "string" },
        steps: { type: "array", minItems: 1, items: { type: "string" } }
      }
    },
    cwe: { type: "string" },
    owasp: { type: "string" },
    tags: { type: "array", items: { type: "string" } }
  }
};

const layerCoverageToolInputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["layer", "coverageStatus", "confidenceSummary"],
  properties: {
    layer: { type: "string", enum: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] },
    coverageStatus: { type: "string", enum: ["covered", "partially_covered", "not_covered"] },
    confidenceSummary: { type: "string" },
    toolRefs: { type: "array", items: { type: "string" } },
    evidenceRefs: { type: "array", items: { type: "string" } },
    vulnerabilityIds: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } }
  }
};

const completionToolInputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "residualRisk", "recommendedNextStep", "stopReason"],
  properties: {
    summary: { type: "string" },
    residualRisk: { type: "string" },
    recommendedNextStep: { type: "string" },
    stopReason: { type: "string" }
  }
};

const singleAgentScanCompletionSchema = z.object({
  summary: z.string().min(1),
  residualRisk: z.string().min(1),
  recommendedNextStep: z.string().min(1),
  stopReason: z.string().min(1)
});

type ExecutedToolResult = {
  toolId: string;
  toolName: string;
  request: ToolRequest;
  effectiveToolInput: Record<string, unknown>;
  toolRunId: string | null;
  observationRefs: string[];
  observationSummaries: string[];
  outputPreview: string;
  fullOutput: string | null;
  status: string;
  statusReason: string | null;
  timedOut: boolean;
};

type CompletionAttemptResult =
  | { accepted: true }
  | { accepted: false; feedback: string };

export type WorkflowDebugEventInput = {
  type: WorkflowTraceEvent["type"];
  status?: WorkflowTraceEvent["status"];
  title: string;
  summary: string;
  detail?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export type WorkflowModelOutputInput = {
  source: "local" | "hosted";
  text: string;
  final?: boolean;
  createdAt?: string;
};

export type WorkflowLinkedScanInput = {
  runId: string;
  applicationId: string;
  runtimeId: string | null;
  agentId: string;
  scope: CreateSingleAgentScanRequest["scope"];
  llm?: ScanLlmConfig;
  onAudit?: (entry: { action: string; details: Record<string, unknown>; timestamp: string }) => Promise<void> | void;
  onWorkflowEvent?: (event: WorkflowDebugEventInput) => Promise<void> | void;
  onWorkflowModelOutput?: (output: WorkflowModelOutputInput) => Promise<void> | void;
};

type SingleAgentContext = {
  scan: Scan;
  scanId: string;
  rootTacticId: string;
  mode: "single-agent" | "workflow";
  request: CreateSingleAgentScanRequest;
  provider: StoredAiProvider;
  model: string;
  llm: ScanLlmConfig | undefined;
  application: NonNullable<Awaited<ReturnType<ApplicationsRepository["getById"]>>>;
  runtime: Awaited<ReturnType<RuntimesRepository["getById"]>>;
  agent: NonNullable<Awaited<ReturnType<AiAgentsRepository["getById"]>>>;
  target: { baseUrl: string; host: string; port?: number };
  tools: AiTool[];
  onAudit: ((entry: { action: string; details: Record<string, unknown>; timestamp: string }) => Promise<void> | void) | undefined;
  onWorkflowEvent: ((event: WorkflowDebugEventInput) => Promise<void> | void) | undefined;
  onWorkflowModelOutput: ((output: WorkflowModelOutputInput) => Promise<void> | void) | undefined;
};

type LoopState = {
  coverageByLayer: Map<ScanLayerCoverage["layer"], ScanLayerCoverage>;
  vulnerabilities: SecurityVulnerability[];
  executedResults: ExecutedToolResult[];
  completion: SingleAgentScanCompletion | null;
};

type LocalModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const coverageRank: Record<ScanLayerCoverage["coverageStatus"], number> = {
  not_covered: 0,
  partially_covered: 1,
  covered: 2
};

const osiLayerNames: Record<ScanLayerCoverage["layer"], string> = {
  L1: "Physical",
  L2: "Data Link",
  L3: "Network",
  L4: "Transport",
  L5: "Session",
  L6: "Presentation",
  L7: "Application"
};

export type SingleAgentExecutionDependencies = {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiToolsRepository: AiToolsRepository;
};

export class SingleAgentExecutionFacade {
  private readonly broker: ToolBroker;
  private readonly maxSteps = 8;

  constructor(private readonly dependencies: SingleAgentExecutionDependencies) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
  }

  async createAndRunScan(input: CreateSingleAgentScanRequest) {
    const { context } = await this.createExecutionContext({
      scanId: randomUUID(),
      mode: "single-agent",
      input
    });
    await this.runLoop(context);

    const persisted = await getSingleAgentScan(context.scanId);
    if (!persisted) {
      throw new RequestError(500, "Single-agent scan record could not be loaded after execution.");
    }

    return persisted;
  }

  async runWorkflowLinkedScan(input: WorkflowLinkedScanInput) {
    const { context } = await this.createExecutionContext({
      scanId: input.runId,
      mode: "workflow",
      input: {
        applicationId: input.applicationId,
        runtimeId: input.runtimeId,
        agentId: input.agentId,
        scope: input.scope,
        ...(input.llm ? { llm: input.llm } : {})
      },
      ...(input.onAudit ? { onAudit: input.onAudit } : {}),
      ...(input.onWorkflowEvent ? { onWorkflowEvent: input.onWorkflowEvent } : {}),
      ...(input.onWorkflowModelOutput ? { onWorkflowModelOutput: input.onWorkflowModelOutput } : {})
    });
    await this.runLoop(context);
  }

  private async createExecutionContext(input: {
    scanId: string;
    mode: "single-agent" | "workflow";
    input: CreateSingleAgentScanRequest;
    onAudit?: (entry: { action: string; details: Record<string, unknown>; timestamp: string }) => Promise<void> | void;
    onWorkflowEvent?: (event: WorkflowDebugEventInput) => Promise<void> | void;
    onWorkflowModelOutput?: (output: WorkflowModelOutputInput) => Promise<void> | void;
  }) {
    const [application, runtime, agent] = await Promise.all([
      this.dependencies.applicationsRepository.getById(input.input.applicationId),
      input.input.runtimeId ? this.dependencies.runtimesRepository.getById(input.input.runtimeId) : Promise.resolve(null),
      this.dependencies.aiAgentsRepository.getById(input.input.agentId)
    ]);

    if (!application) {
      throw new RequestError(404, "Application not found.");
    }
    if (input.input.runtimeId && !runtime) {
      throw new RequestError(404, "Runtime not found.");
    }
    if (!agent) {
      throw new RequestError(404, "AI agent not found.");
    }

    const provider = await this.dependencies.aiProvidersRepository.getStoredById(agent.providerId);
    this.assertProvider(provider, input.input.llm);

    const model = input.input.llm?.model ?? agent.modelOverride ?? provider.model;
    const target = parseTarget(application.baseUrl ?? this.normalizeTarget(input.input.scope.targets[0] ?? ""));
    const scanId = input.scanId;
    const rootTacticId = randomUUID();
    const createdAt = new Date().toISOString();
    const scan: Scan = {
      id: scanId,
      scope: input.input.scope,
      status: "running",
      currentRound: 0,
      tacticsTotal: this.maxSteps,
      tacticsComplete: 0,
      createdAt
    };

    const existing = await getScan(scanId);
    if (!existing) {
      await createScan(scan, {
        mode: input.mode,
        applicationId: application.id,
        runtimeId: runtime?.id ?? null,
        agentId: agent.id,
        ...(input.input.llm ? { llm: input.input.llm } : {})
      });
    } else {
      await updateSingleAgentScan(scanId, {
        status: "running",
        currentRound: 0,
        tacticsTotal: this.maxSteps,
        tacticsComplete: 0,
        completedAt: null,
        stopReason: null,
        summary: null
      });
    }

    await createDfsNode({
      id: rootTacticId,
      scanId,
      target: target.host,
      layer: input.input.scope.layers[0] ?? "L7",
      riskScore: 0.5,
      status: "pending",
      parentTacticId: null,
      depth: 0,
      createdAt
    });

    const policy = AGENT_TOOL_POLICIES.find((candidate) => candidate.agentId === agent.id);
    const tools = policy
      ? await resolveAgentTools(
        agent.id,
        agent.toolIds,
        (
          await this.dependencies.aiToolsRepository.list({
            status: "active",
            page: 1,
            pageSize: 500,
            sortBy: "name",
            sortDirection: "asc"
          })
        ).items,
        policy
      )
      : (
        await Promise.all(agent.toolIds.map(async (toolId) => this.dependencies.aiToolsRepository.getById(toolId)))
      ).filter((candidate): candidate is AiTool => Boolean(candidate));

    const context: SingleAgentContext = {
      scan,
      scanId,
      rootTacticId,
      mode: input.mode,
      request: input.input,
      provider,
      model,
      llm: input.input.llm,
      application,
      runtime,
      agent,
      target,
      tools,
      onAudit: input.onAudit,
      onWorkflowEvent: input.onWorkflowEvent,
      onWorkflowModelOutput: input.onWorkflowModelOutput
    };

    return { context };
  }

  private async runLoop(context: SingleAgentContext) {
    const { request, application, runtime, agent, target, rootTacticId, scanId, provider } = context;
    const createdAt = context.scan.createdAt;
    const systemPrompt = this.buildSystemPrompt(context, provider.kind === "local" ? "local" : "hosted", context.tools);
    const userPrompt = this.buildUserPrompt(context, context.tools);

    const state: LoopState = {
      coverageByLayer: new Map(),
      vulnerabilities: [],
      executedResults: [],
      completion: null
    };

    for (const layer of request.scope.layers) {
      await this.persistCoverage(context, state, {
        scanId,
        layer,
        coverageStatus: "not_covered",
        confidenceSummary: "No evidence recorded yet.",
        toolRefs: [],
        evidenceRefs: [],
        vulnerabilityIds: [],
        gaps: ["No agent evidence recorded for this layer yet."],
        updatedAt: createdAt
      });
    }

    await this.audit(context, "single-agent-scan-started", {
      applicationId: application.id,
      runtimeId: runtime?.id ?? null,
      agentId: agent.id,
      target: target.baseUrl,
      layers: request.scope.layers
    });

    await this.emitWorkflowEvent(context, {
      type: "system_message",
      status: "completed",
      title: "Single-agent runtime bootstrapped",
      summary: "Loaded the preconfigured scope, target, approved tools, and verification policy for this run.",
      detail: [
        `Application: ${application.name}`,
        `Target: ${target.baseUrl}`,
        runtime ? `Runtime: ${runtime.name} (${runtime.provider}, ${runtime.region})` : null,
        `Requested OSI layers: ${request.scope.layers.join(", ")}`,
        `Approved tools: ${context.tools.map((tool) => tool.name).join(", ") || "none"}`
      ].filter(Boolean).join("\n"),
      payload: {
        lane: "system",
        messageKind: "status",
        applicationId: application.id,
        applicationName: application.name,
        runtimeId: runtime?.id ?? null,
        runtimeName: runtime?.name ?? null,
        targetUrl: target.baseUrl,
        layers: request.scope.layers,
        approvedToolIds: context.tools.map((tool) => tool.id),
        approvedToolNames: context.tools.map((tool) => tool.name)
      },
      createdAt
    });

    await this.emitWorkflowEvent(context, {
      type: "system_message",
      status: "completed",
      title: "Rendered system prompt",
      summary: "Persisted the exact system instruction payload used to drive the single-agent loop.",
      detail: systemPrompt,
      payload: {
        lane: "system",
        messageKind: "prompt",
        promptKind: "system",
        fullPrompt: systemPrompt
      },
      createdAt
    });

    await this.emitWorkflowEvent(context, {
      type: "system_message",
      status: "completed",
      title: "Rendered task prompt",
      summary: "Persisted the exact task prompt delivered to the agent for this run.",
      detail: userPrompt,
      payload: {
        lane: "system",
        messageKind: "prompt",
        promptKind: "task",
        fullPrompt: userPrompt
      },
      createdAt
    });

    try {
      await updateNodeStatus(rootTacticId, "in-progress");
      if (provider.kind === "local") {
        await this.runLocalLoop(context, state);
      } else {
        await this.runAnthropicLoop(context, state);
      }

      if (!state.completion) {
        throw new Error("Agent did not submit a completion payload.");
      }

      await updateNodeStatus(rootTacticId, "complete");
      await updateSingleAgentScan(scanId, {
        status: "complete",
        currentRound: this.maxSteps,
        tacticsComplete: this.maxSteps,
        completedAt: new Date().toISOString(),
        stopReason: state.completion.stopReason,
        summary: {
          summary: state.completion.summary,
          residualRisk: state.completion.residualRisk,
          recommendedNextStep: state.completion.recommendedNextStep
        }
      });

      await this.audit(context, "single-agent-scan-completed", {
        stopReason: state.completion.stopReason,
        vulnerabilityCount: state.vulnerabilities.length,
        coverageLayers: [...state.coverageByLayer.keys()]
      });
    } catch (error) {
      const failureDetail = error instanceof Error ? error.message : String(error);
      const reason = error instanceof Error && error.cause instanceof Error ? error.cause.message : failureDetail;
      await updateNodeStatus(rootTacticId, "skipped");
      await updateSingleAgentScan(scanId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        stopReason: reason,
        summary: {
          summary: "The single-agent scan stopped before producing a valid completion payload.",
          residualRisk: "The scan may have missed vulnerabilities or coverage updates after the failure.",
          recommendedNextStep: "Inspect the scan trace and rerun after resolving the model or tool failure."
        }
      });
      await this.audit(context, "single-agent-scan-failed", { reason: failureDetail });

      if (context.mode === "workflow") {
        await this.emitWorkflowEvent(context, {
          type: "stage_failed",
          status: "failed",
          title: "OSI Security Pass failed",
          summary: failureDetail,
          detail: failureDetail,
          payload: {
            lane: "system",
            messageKind: "status"
          }
        });
      }

      if (context.mode === "workflow") {
        throw error;
      }
    }
  }

  private async runAnthropicLoop(context: SingleAgentContext, state: LoopState) {
    const model = this.createAnthropicLanguageModel(context.provider, context.model);
    const selectedTools = selectToolsForContext(context.tools, this.buildSelectorContext(state, context));
    const evidenceTools = Object.fromEntries(selectedTools.map((tool) => [
      tool.id,
      createSdkTool({
        description: tool.description ?? tool.name,
        inputSchema: jsonSchema(tool.inputSchema),
        execute: async (rawInput) => this.executeEvidenceTool(context, state, tool, rawInput)
      })
    ]));

    const result = await generateText({
      model,
      system: this.buildSystemPrompt(context, "hosted", selectedTools),
      prompt: this.buildUserPrompt(context, selectedTools),
      tools: {
        ...evidenceTools,
        report_vulnerability: createSdkTool({
          description: "Persist one evidence-backed structured security vulnerability.",
          inputSchema: jsonSchema(vulnerabilityToolInputJsonSchema as Parameters<typeof jsonSchema>[0]),
          execute: async (rawInput) => this.reportVulnerability(context, state, rawInput)
        }),
        update_layer_coverage: createSdkTool({
          description: "Persist the current coverage state for one OSI layer.",
          inputSchema: jsonSchema(layerCoverageToolInputJsonSchema as Parameters<typeof jsonSchema>[0]),
          execute: async (rawInput) => this.updateLayerCoverage(context, state, rawInput)
        }),
        submit_scan_completion: createSdkTool({
          description: "Submit the final structured closeout for this scan.",
          inputSchema: jsonSchema(completionToolInputJsonSchema as Parameters<typeof jsonSchema>[0]),
          execute: async (rawInput) => this.submitCompletion(context, state, rawInput)
        })
      },
      stopWhen: stepCountIs(this.maxSteps)
    });

    if (result.text?.trim()) {
      await context.onWorkflowModelOutput?.({
        source: "hosted",
        text: result.text,
        final: true,
        createdAt: new Date().toISOString()
      });
    }

    if (!state.completion) {
      await this.emitWorkflowEvent(context, {
        type: "verification",
        status: "failed",
        title: "Verifier rejected the hosted-model closeout",
        summary: "The hosted model ended without submitting submit_scan_completion.",
        detail: result.text || "The hosted model returned no final structured completion payload.",
        payload: {
          lane: "verification",
          messageKind: "challenge",
          rawModelOutput: result.text || null,
          usage: result.usage ?? null
        }
      });
      throw new Error("Hosted model did not submit a completion payload.");
    }

    await this.emitWorkflowEvent(context, {
      type: "model_decision",
      status: "completed",
      title: "Agent completed hosted-model reasoning",
      summary: "The hosted model finished its tool-augmented pass and returned a final reasoning block.",
      detail: result.text || null,
      payload: {
        lane: "agent",
        messageKind: "decision",
        reasoning: result.text,
        rawModelOutput: result.text,
        usage: result.usage ?? null
      }
    });
  }

  private async runLocalLoop(context: SingleAgentContext, state: LoopState) {
    const messages: LocalModelMessage[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(context, "local", context.tools)
      },
      {
        role: "user",
        content: this.buildUserPrompt(context, context.tools)
      }
    ];

    for (let iteration = 0; iteration < this.maxSteps; iteration += 1) {
      const selectedTools = selectToolsForContext(
        context.tools,
        this.buildSelectorContext(state, context),
        { maxTools: 12 }
      );
      messages[0] = {
        role: "system",
        content: this.buildSystemPrompt(context, "local", selectedTools)
      };
      messages[1] = {
        role: "user",
        content: this.buildUserPrompt(context, selectedTools)
      };

      const rawContent = await this.callLocalModel(context.provider, context.model, messages, context.llm?.apiPath);
      if (rawContent.trim()) {
        await context.onWorkflowModelOutput?.({
          source: "local",
          text: rawContent,
          final: true,
          createdAt: new Date().toISOString()
        });
      }
      messages.push({ role: "assistant", content: rawContent });
      const actionEnvelope = this.parseJsonObjectFromModel(rawContent);
      const action = typeof actionEnvelope["action"] === "string" ? actionEnvelope["action"] : "";
      const reasoning = typeof actionEnvelope["reasoning"] === "string" ? actionEnvelope["reasoning"] : "";
      const actionSummary = this.describeAction(actionEnvelope, context);

      await this.emitWorkflowEvent(context, {
        type: "model_decision",
        status: "completed",
        title: actionSummary.title,
        summary: actionSummary.summary,
        detail: rawContent,
        payload: {
          lane: "agent",
          messageKind: "decision",
          iteration: iteration + 1,
          action,
          reasoning,
          rawModelOutput: rawContent,
          ...(actionSummary.payload ?? {})
        }
      });

      const reasoningChallenge = this.getOsiReasoningChallenge(actionEnvelope);
      if (reasoningChallenge) {
        await this.emitWorkflowEvent(context, {
          type: "verification",
          status: "failed",
          title: "Verifier challenged the OSI layer reasoning",
          summary: reasoningChallenge.summary,
          detail: reasoningChallenge.detail,
          payload: {
            lane: "verification",
            messageKind: "challenge",
            layer: reasoningChallenge.layer
          }
        });
        messages.push({ role: "user", content: reasoningChallenge.feedback });
      }

      if (action === "call_tool") {
        const toolId = typeof actionEnvelope["toolId"] === "string" ? actionEnvelope["toolId"] : "";
        const tool = selectedTools.find((candidate) => candidate.id === toolId);
        if (!tool) {
          await this.emitWorkflowEvent(context, {
            type: "verification",
            status: "failed",
            title: "Verifier rejected the requested tool",
            summary: `Tool ${toolId || "<missing>"} is not available to this run.`,
            detail: "The agent must choose one of the approved tools before progress can continue.",
            payload: {
              lane: "verification",
              messageKind: "challenge",
              toolId
            }
          });
          messages.push({ role: "user", content: `Tool ${toolId || "<missing>"} is not available.` });
          continue;
        }

        const result = await this.executeEvidenceTool(context, state, tool, actionEnvelope["input"]);
        messages.push({ role: "user", content: JSON.stringify({ toolResult: result }) });
        continue;
      }

      if (action === "report_vulnerability") {
        const result = await this.reportVulnerability(context, state, actionEnvelope["vulnerability"]);
        messages.push({ role: "user", content: JSON.stringify(result) });
        continue;
      }

      if (action === "update_layer_coverage") {
        const result = await this.updateLayerCoverage(context, state, actionEnvelope["coverage"]);
        messages.push({ role: "user", content: JSON.stringify(result) });
        continue;
      }

      if (action === "submit_scan_completion") {
        const result = await this.submitCompletion(context, state, actionEnvelope["completion"]);
        if (result.accepted) {
          break;
        }
        messages.push({ role: "user", content: result.feedback });
        continue;
      }

      await this.emitWorkflowEvent(context, {
        type: "verification",
        status: "failed",
        title: "Verifier rejected the model action",
        summary: `Unsupported action ${action || "<missing>"} was returned by the model.`,
        detail: "The agent must emit one of the supported structured actions before the run can continue.",
        payload: {
          lane: "verification",
          messageKind: "challenge",
          action
        }
      });
      messages.push({
        role: "user",
        content: [
          `Unsupported action ${action || "<missing>"}.`,
          "Supported actions:",
          "- call_tool",
          "- report_vulnerability",
          "- update_layer_coverage",
          "- submit_scan_completion",
          "Return exactly one JSON object using one supported action."
        ].join("\n")
      });
    }
  }

  private async executeEvidenceTool(
    context: SingleAgentContext,
    state: LoopState,
    tool: AiTool,
    rawInput: unknown
  ) {
    const toolInput = normalizeToolInput(rawInput);
    const executionTarget = parseExecutionTarget(toolInput, context.target);
    const normalizedToolInput = {
      ...toolInput,
      target: executionTarget.target,
      ...(executionTarget.port === undefined ? {} : { port: executionTarget.port }),
      baseUrl: `http://${executionTarget.target}${executionTarget.port ? `:${executionTarget.port}` : ""}${"path" in executionTarget && typeof executionTarget.path === "string" ? executionTarget.path : ""}`
    };
    const request = compileToolRequestFromDefinition(tool, {
      target: executionTarget.target,
      ...(executionTarget.port === undefined ? {} : { port: executionTarget.port }),
      layer: this.resolveClaimedLayer(toolInput, context),
      justification: `Single-agent scan evidence collection for ${tool.name}.`,
      toolInput: normalizedToolInput
    });
    const effectiveToolInput = request.parameters["toolInput"] as Record<string, unknown>;

    await this.audit(context, "single-agent-tool-requested", {
      toolId: tool.id,
      toolName: tool.name,
      target: request.target,
      layer: request.layer
    });

    await this.emitWorkflowEvent(context, {
      type: "tool_call",
      status: "running",
      title: `${tool.name} invoked`,
      summary: `The agent requested ${tool.name} against ${request.target}${request.port ? `:${request.port}` : ""}.`,
      detail: JSON.stringify(effectiveToolInput, null, 2),
      payload: {
        lane: "tool",
        messageKind: "status",
        toolId: tool.id,
        toolName: tool.name,
        toolInput: effectiveToolInput,
        target: request.target,
        port: request.port ?? null,
        layer: request.layer,
        request
      }
    });

    const result = await this.broker.executeRequests({
      scan: context.scan,
      tacticId: context.rootTacticId,
      agentId: context.agent.id,
      requests: [request]
    });

    const toolRun = result.toolRuns[0];
    const executed: ExecutedToolResult = {
      toolId: tool.id,
      toolName: tool.name,
      request,
      effectiveToolInput,
      toolRunId: toolRun?.id ?? null,
      observationRefs: result.observations.map((item) => item.id),
      observationSummaries: result.observations.map((item) => item.summary),
      outputPreview: truncate(toolRun?.output ?? toolRun?.statusReason ?? `${tool.name} completed.`),
      fullOutput: toolRun?.output ?? toolRun?.statusReason ?? null,
      status: toolRun?.status ?? "failed",
      statusReason: toolRun?.statusReason ?? null,
      timedOut: (toolRun?.statusReason ?? "").toLowerCase().includes("timed out")
    };
    state.executedResults.push(executed);

    const hasEvidence = executed.observationRefs.length > 0;
    const verificationAccepted = executed.status === "completed" && hasEvidence;

    await this.emitWorkflowEvent(context, {
      type: "tool_result",
      status: executed.status === "completed" ? "completed" : "failed",
      title: `${tool.name} returned ${executed.status}`,
      summary: executed.outputPreview,
      detail: executed.fullOutput,
      payload: {
        lane: "tool",
        messageKind: "status",
        toolId: tool.id,
        toolName: tool.name,
        toolInput: effectiveToolInput,
        toolRun,
        request,
        observationSummaries: executed.observationSummaries,
        outputPreview: executed.outputPreview,
        fullOutput: executed.fullOutput,
        durationMs: null,
        timedOut: executed.timedOut
      }
    });

    await this.emitWorkflowEvent(context, {
      type: "verification",
      status: verificationAccepted ? "completed" : "failed",
      title: `Evidence checkpoint after ${tool.name}`,
      summary: verificationAccepted
        ? `Accepted ${executed.observationRefs.length} observation reference(s) from ${tool.name} as usable evidence for ${request.layer}.`
        : executed.status === "completed"
          ? `${tool.name} completed but produced no persisted observations, so ${request.layer} remains unsupported by evidence.`
          : `${tool.name} did not complete cleanly; the agent must retry, switch tools, or record the layer as blocked.`,
      detail: [
        `Tool status: ${executed.status}${executed.statusReason ? ` (${executed.statusReason})` : ""}`,
        `Observation count: ${executed.observationRefs.length}`,
        verificationAccepted ? `Accepted evidence summaries: ${executed.observationSummaries.join(" | ")}` : "No accepted evidence was recorded from this tool run.",
        executed.fullOutput ? `Tool output:\n${executed.fullOutput}` : null
      ].filter(Boolean).join("\n\n"),
      payload: {
        lane: "verification",
        messageKind: verificationAccepted ? "accept" : "challenge",
        toolId: tool.id,
        toolName: tool.name,
        observationRefs: executed.observationRefs,
        observationSummaries: executed.observationSummaries,
        toolRunId: executed.toolRunId,
        layer: request.layer,
        accepted: verificationAccepted,
        timedOut: executed.timedOut
      }
    });

    const inferredLayer = request.layer;
    const current = state.coverageByLayer.get(inferredLayer);
    if (current && current.coverageStatus === "not_covered" && verificationAccepted) {
      await this.persistCoverage(context, state, {
        ...current,
        coverageStatus: "partially_covered",
        confidenceSummary: `Evidence collection started through ${tool.name}.`,
        toolRefs: unique([...current.toolRefs, tool.id]),
        evidenceRefs: unique([...current.evidenceRefs, ...executed.observationRefs]),
        gaps: current.gaps.filter((entry) => entry !== "No agent evidence recorded for this layer yet."),
        updatedAt: new Date().toISOString()
      });
    }

    await updateSingleAgentScan(context.scanId, {
      currentRound: Math.min(context.scan.currentRound + state.executedResults.length, this.maxSteps),
      tacticsComplete: Math.min(state.executedResults.length, this.maxSteps)
    });

    return {
      status: toolRun?.status ?? "failed",
      outputPreview: executed.outputPreview,
      observationRefs: executed.observationRefs,
      toolRunId: executed.toolRunId,
      timedOut: executed.timedOut
    };
  }

  private async reportVulnerability(
    context: SingleAgentContext,
    state: LoopState,
    rawInput: unknown
  ) {
    const parsed = securityVulnerabilitySubmissionSchema.parse(rawInput);
    const vulnerability: SecurityVulnerability = {
      id: randomUUID(),
      scanId: context.scanId,
      agentId: context.agent.id,
      createdAt: new Date().toISOString(),
      ...parsed
    };

    await createSecurityVulnerability(context.scanId, context.agent.id, context.rootTacticId, vulnerability);
    state.vulnerabilities.push(vulnerability);

    await this.emitWorkflowEvent(context, {
      type: "verification",
      status: "completed",
      title: "Verifier accepted the vulnerability evidence",
      summary: `Accepted ${vulnerability.title} after checking that the submission included concrete evidence.`,
      detail: vulnerability.evidence.map((item) => item.quote).join("\n\n"),
      payload: {
        lane: "verification",
        messageKind: "accept",
        vulnerabilityId: vulnerability.id,
        evidenceRefs: vulnerability.evidence.flatMap((item) => [item.artifactRef, item.observationRef, item.toolRunRef].filter((value): value is string => Boolean(value)))
      }
    });

    await this.audit(context, "single-agent-vulnerability-reported", {
      vulnerabilityId: vulnerability.id,
      title: vulnerability.title,
      severity: vulnerability.severity,
      primaryLayer: vulnerability.primaryLayer
    });

    const existing = state.coverageByLayer.get(vulnerability.primaryLayer);
    if (existing) {
      await this.persistCoverage(context, state, {
        ...existing,
        coverageStatus: coverageRank[existing.coverageStatus] >= coverageRank["partially_covered"] ? existing.coverageStatus : "partially_covered",
        confidenceSummary: `Evidence-backed vulnerability recorded: ${vulnerability.title}.`,
        vulnerabilityIds: unique([...existing.vulnerabilityIds, vulnerability.id]),
        evidenceRefs: unique([
          ...existing.evidenceRefs,
          ...vulnerability.evidence.flatMap((item) => [item.artifactRef, item.observationRef].filter((value): value is string => Boolean(value)))
        ]),
        toolRefs: unique([
          ...existing.toolRefs,
          ...vulnerability.evidence.flatMap((item) => item.sourceTool ? [item.sourceTool] : [])
        ]),
        gaps: existing.gaps.filter((entry) => entry !== "No agent evidence recorded for this layer yet."),
        updatedAt: new Date().toISOString()
      });
    }

    await this.emitWorkflowEvent(context, {
      type: "finding_reported",
      status: "completed",
      title: `Vulnerability reported: ${vulnerability.title}`,
      summary: `${vulnerability.severity.toUpperCase()} ${vulnerability.category} on ${vulnerability.target.host}.`,
      detail: vulnerability.impact,
      payload: {
        lane: "agent",
        messageKind: "decision",
        finding: vulnerability
      }
    });

    return {
      accepted: true,
      vulnerabilityId: vulnerability.id
    };
  }

  private async updateLayerCoverage(
    context: SingleAgentContext,
    state: LoopState,
    rawInput: unknown
  ) {
    const parsed = scanLayerCoverageSubmissionSchema.parse(rawInput);
    const unknownVulnerabilityIds = parsed.vulnerabilityIds.filter(
      (id) => !state.vulnerabilities.some((item) => item.id === id)
    );
    if (unknownVulnerabilityIds.length > 0) {
      throw new Error(`Unknown vulnerability ids: ${unknownVulnerabilityIds.join(", ")}`);
    }

    const coverage: ScanLayerCoverage = {
      scanId: context.scanId,
      updatedAt: new Date().toISOString(),
      ...parsed
    };
    await this.persistCoverage(context, state, coverage);
    return { accepted: true, layer: coverage.layer };
  }

  private async submitCompletion(
    context: SingleAgentContext,
    state: LoopState,
    rawInput: unknown
  ): Promise<CompletionAttemptResult> {
    const parsed = singleAgentScanCompletionSchema.safeParse(rawInput);
    if (!parsed.success) {
      const missingFields = parsed.error.issues
        .map((issue) => issue.path.join("."))
        .filter((value) => value.length > 0);
      const feedback = `The closeout is invalid. Required completion fields are missing or malformed: ${missingFields.join(", ")}. Resubmit submit_scan_completion with summary, residualRisk, recommendedNextStep, and stopReason.`;
      await this.emitWorkflowEvent(context, {
        type: "verification",
        status: "failed",
        title: "Verifier rejected the scan closeout",
        summary: `The closeout payload is missing required fields: ${missingFields.join(", ")}.`,
        detail: parsed.error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("\n"),
        payload: {
          lane: "verification",
          messageKind: "retry",
          issues: parsed.error.issues
        }
      });
      return { accepted: false, feedback };
    }

    const completion = parsed.data;
    const coverageClaimIssue = this.getUnsupportedCoverageClaim(context, state, completion);
    if (coverageClaimIssue) {
      await this.emitWorkflowEvent(context, {
        type: "verification",
        status: "failed",
        title: "Verifier rejected the scan closeout",
        summary: coverageClaimIssue.summary,
        detail: coverageClaimIssue.detail,
        payload: {
          lane: "verification",
          messageKind: "retry",
          unsupportedLayers: coverageClaimIssue.unsupportedLayers
        }
      });
      return {
        accepted: false,
        feedback: `${coverageClaimIssue.summary} Update the closeout so it matches the persisted per-layer coverage and residual risk.`
      };
    }

    state.completion = completion;
    await this.emitWorkflowEvent(context, {
      type: "verification",
      status: "completed",
      title: "Verifier accepted the scan closeout",
      summary: "The structured closeout satisfied the single-agent completion contract for this run.",
      detail: [
        `Summary: ${completion.summary}`,
        `Residual risk: ${completion.residualRisk}`,
        `Recommended next step: ${completion.recommendedNextStep}`,
        `Stop reason: ${completion.stopReason}`
      ].join("\n"),
      payload: {
        lane: "verification",
        messageKind: "accept",
        completion
      }
    });
    await this.audit(context, "single-agent-scan-closeout-submitted", completion);
    await this.emitWorkflowEvent(context, {
      type: "agent_summary",
      status: "completed",
      title: "Single-agent closeout submitted",
      summary: completion.summary,
      detail: completion.residualRisk,
      payload: {
        lane: "agent",
        messageKind: "completion",
        ...completion
      }
    });
    return { accepted: true };
  }

  private async persistCoverage(context: SingleAgentContext, state: LoopState, next: ScanLayerCoverage) {
    const current = state.coverageByLayer.get(next.layer);
    const merged = current
      ? {
          ...next,
          coverageStatus: coverageRank[next.coverageStatus] >= coverageRank[current.coverageStatus]
            ? next.coverageStatus
            : current.coverageStatus,
          toolRefs: unique([...current.toolRefs, ...next.toolRefs]),
          evidenceRefs: unique([...current.evidenceRefs, ...next.evidenceRefs]),
          vulnerabilityIds: unique([...current.vulnerabilityIds, ...next.vulnerabilityIds]),
          gaps: unique([...current.gaps, ...next.gaps]).filter((entry, index, values) => {
            if (mergedCoveredValue(next.coverageStatus, current.coverageStatus) && entry === "No agent evidence recorded for this layer yet.") {
              return false;
            }
            return values.indexOf(entry) === index;
          }),
          confidenceSummary: next.confidenceSummary
        }
      : next;

    await upsertLayerCoverage(merged);
    state.coverageByLayer.set(merged.layer, merged);
    await this.audit(context, "single-agent-layer-coverage-updated", {
      layer: merged.layer,
      coverageStatus: merged.coverageStatus,
      vulnerabilityIds: merged.vulnerabilityIds
    });

    const materialChange = !current
      || current.coverageStatus !== merged.coverageStatus
      || JSON.stringify(current.toolRefs) !== JSON.stringify(merged.toolRefs)
      || JSON.stringify(current.evidenceRefs) !== JSON.stringify(merged.evidenceRefs)
      || JSON.stringify(current.vulnerabilityIds) !== JSON.stringify(merged.vulnerabilityIds)
      || current.confidenceSummary !== merged.confidenceSummary;

    if (
      materialChange
      && !(merged.coverageStatus === "not_covered" && merged.toolRefs.length === 0 && merged.evidenceRefs.length === 0 && merged.vulnerabilityIds.length === 0)
    ) {
      await this.emitWorkflowEvent(context, {
        type: "verification",
        status: "completed",
        title: `Layer coverage updated: ${merged.layer}`,
        summary: `${merged.layer} is now ${merged.coverageStatus.replaceAll("_", " ")}.`,
        detail: merged.confidenceSummary,
        payload: {
          lane: "verification",
          messageKind: "status",
          layer: merged.layer,
          coverageStatus: merged.coverageStatus,
          toolRefs: merged.toolRefs,
          evidenceRefs: merged.evidenceRefs,
          vulnerabilityIds: merged.vulnerabilityIds,
          gaps: merged.gaps
        }
      });
    }
  }

  private buildSelectorContext(state: LoopState, context: SingleAgentContext): ToolSelectorContext {
    return {
      requestedLayers: context.request.scope.layers,
      currentCoverage: state.coverageByLayer,
      executedToolIds: state.executedResults.map((result) => result.toolId),
      findings: state.vulnerabilities.map((vulnerability) => ({
        primaryLayer: vulnerability.primaryLayer,
        category: vulnerability.category
      })),
      allowActiveExploits: context.request.scope.allowActiveExploits
    };
  }

  private buildSystemPrompt(context: SingleAgentContext, mode: "local" | "hosted", tools: AiTool[]) {
    if (mode === "hosted") {
      return context.agent.systemPrompt;
    }

    return [
      context.agent.systemPrompt,
      "You are operating a single-agent security scan loop across the requested OSI layers.",
      `Target application: ${context.application.name}`,
      `Target URL: ${context.target.baseUrl}`,
      context.runtime ? `Runtime: ${context.runtime.name} (${context.runtime.provider}, ${context.runtime.region})` : null,
      `Allowed tools this turn: ${tools.map((tool) => `${tool.id}=${tool.name}`).join(", ") || "none"}`,
      `Requested layers: ${context.request.scope.layers.join(", ")}`,
      "You are running in structured JSON action mode.",
      "Return exactly one JSON object per turn.",
      "Canonical OSI mapping: L1 Physical, L2 Data Link, L3 Network, L4 Transport, L5 Session, L6 Presentation, L7 Application.",
      'Valid actions: {"action":"call_tool","toolId":"string","input":{...},"reasoning":"string"}',
      'Valid actions: {"action":"report_vulnerability","vulnerability":{...},"reasoning":"string"}',
      'Valid actions: {"action":"update_layer_coverage","coverage":{...},"reasoning":"string"}',
      'Valid actions: {"action":"submit_scan_completion","completion":{...},"reasoning":"string"}',
      'For call_tool, include input.target, input.baseUrl, and input.layer when known. Prefer target="localhost" and baseUrl="http://localhost:8888" style shapes over url-only inputs.',
      'Example call_tool: {"action":"call_tool","toolId":"seed-service-scan","input":{"target":"localhost","baseUrl":"http://localhost:8888","layer":"L4"},"reasoning":"Use L4 transport evidence to confirm service reachability."}',
      "submit_scan_completion requires completion.summary, completion.residualRisk, completion.recommendedNextStep, and completion.stopReason.",
      "Use tools only for concrete evidence collection inside the approved scope.",
      "Do not invent tool results.",
      "Persist every concrete vulnerability through report_vulnerability.",
      "Persist per-layer coverage updates as your knowledge changes.",
      "Do not claim full L1-L7 coverage unless the persisted layer coverage actually shows every requested layer as covered.",
      "You must finish with submit_scan_completion exactly once."
    ].filter(Boolean).join("\n");
  }

  private buildUserPrompt(context: SingleAgentContext, tools: AiTool[]) {
    return [
      `Scan scope targets: ${context.request.scope.targets.join(", ")}`,
      `Requested layers: ${context.request.scope.layers.join(", ")}`,
      `Max depth: ${context.request.scope.maxDepth}`,
      `Max duration minutes: ${context.request.scope.maxDurationMinutes}`,
      `Rate limit RPS: ${context.request.scope.rateLimitRps}`,
      `Allow active exploits: ${String(context.request.scope.allowActiveExploits)}`,
      "Available tools this turn:",
      ...tools.map((tool) => {
        const propertyKeys = typeof tool.inputSchema["properties"] === "object" && tool.inputSchema["properties"] !== null
          ? Object.keys(tool.inputSchema["properties"] as Record<string, unknown>)
          : [];
        return `- ${tool.id}: ${tool.name} [${tool.category}/${tool.riskTier}] inputKeys=${propertyKeys.join(",") || "none"}`;
      }),
      "Lifecycle actions always available: report_vulnerability, update_layer_coverage, submit_scan_completion.",
      "Start with the next highest-value evidence action.",
      "If a requested layer is blocked or unsupported, record that explicitly in layer coverage.",
      "Only claim coverage that is supported by persisted tool evidence or accepted vulnerabilities.",
      "The final closeout must include summary, residualRisk, recommendedNextStep, and stopReason.",
      "If you have enough evidence to stop, submit the structured completion payload."
    ].join("\n");
  }

  private createAnthropicLanguageModel(provider: StoredAiProvider, model: string): LanguageModel {
    if (!provider.apiKey) {
      throw new RequestError(400, "Single-agent scans require an Anthropic API key when the selected agent uses an Anthropic provider.");
    }

    const anthropic = createAnthropic({ apiKey: provider.apiKey });
    return anthropic(model);
  }

  private async callLocalModel(
    provider: StoredAiProvider,
    model: string,
    messages: LocalModelMessage[],
    apiPath = "/api/chat"
  ) {
    const baseUrl = provider.baseUrl;
    if (!baseUrl) {
      throw new Error("Local single-agent execution requires a provider base URL.");
    }

    const requestUrl = new URL(apiPath, baseUrl).toString();
    let response: Response;
    try {
      response = await fetch(requestUrl, {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Local provider request failed for model ${model} at ${requestUrl}: ${message}`, {
        cause: error instanceof Error ? error : undefined
      });
    }

    if (!response.ok) {
      throw new Error(`Local provider request failed for model ${model} at ${requestUrl} with status ${response.status}.`);
    }

    let payload: { message?: { content?: string } };
    try {
      payload = await response.json() as { message?: { content?: string } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Local provider returned invalid JSON for model ${model} at ${requestUrl}: ${message}`);
    }
    const content = payload.message?.content?.trim();
    if (!content) {
      throw new Error(`Local provider returned an empty single-agent response for model ${model} at ${requestUrl}.`);
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

  private describeAction(actionEnvelope: Record<string, unknown>, context: SingleAgentContext) {
    const action = typeof actionEnvelope["action"] === "string" ? actionEnvelope["action"] : "";
    const reasoning = typeof actionEnvelope["reasoning"] === "string" ? actionEnvelope["reasoning"] : "";

    if (action === "call_tool") {
      const toolId = typeof actionEnvelope["toolId"] === "string" ? actionEnvelope["toolId"] : "";
      const tool = context.tools.find((candidate) => candidate.id === toolId);
      const selectedToolName = tool?.name || toolId || "a tool";
      const executionTarget = tool ? parseExecutionTarget(normalizeToolInput(actionEnvelope["input"]), context.target) : null;
      const groundedTarget = executionTarget
        ? `${executionTarget.target}${executionTarget.port ? `:${executionTarget.port}` : ""}`
        : `${context.target.host}${context.target.port ? `:${context.target.port}` : ""}`;
      const groundedSummary = `The agent selected ${selectedToolName} for concrete ${tool?.category ?? "security"} evidence against ${groundedTarget}.`;
      return {
        title: `Agent selected ${selectedToolName}`,
        summary: groundedSummary,
        payload: {
          toolId,
          toolName: tool?.name ?? null,
          toolCategory: tool?.category ?? null,
          toolInput: normalizeToolInput(actionEnvelope["input"]),
          modelReasoning: reasoning
        }
      };
    }

    if (action === "report_vulnerability") {
      const vulnerability = typeof actionEnvelope["vulnerability"] === "object" && actionEnvelope["vulnerability"] !== null
        ? actionEnvelope["vulnerability"] as Record<string, unknown>
        : null;
      return {
        title: `Agent proposed vulnerability ${typeof vulnerability?.["title"] === "string" ? vulnerability["title"] : ""}`.trim(),
        summary: reasoning || "The agent believes it has enough evidence to persist a vulnerability.",
        payload: {
          vulnerabilityTitle: typeof vulnerability?.["title"] === "string" ? vulnerability["title"] : null,
          primaryLayer: typeof vulnerability?.["primaryLayer"] === "string" ? vulnerability["primaryLayer"] : null
        }
      };
    }

    if (action === "update_layer_coverage") {
      const coverage = typeof actionEnvelope["coverage"] === "object" && actionEnvelope["coverage"] !== null
        ? actionEnvelope["coverage"] as Record<string, unknown>
        : null;
      return {
        title: `Agent updated layer coverage for ${typeof coverage?.["layer"] === "string" ? coverage["layer"] : "a layer"}`,
        summary: reasoning || "The agent updated the current coverage state from the latest evidence.",
        payload: {
          layer: typeof coverage?.["layer"] === "string" ? coverage["layer"] : null,
          coverageStatus: typeof coverage?.["coverageStatus"] === "string" ? coverage["coverageStatus"] : null
        }
      };
    }

    if (action === "submit_scan_completion") {
      return {
        title: "Agent submitted the final closeout",
        summary: reasoning || "The agent believes the run has reached a valid stopping point.",
        payload: {}
      };
    }

    return {
      title: "Agent returned an unsupported action",
      summary: reasoning || "The model response did not match one of the supported structured actions.",
      payload: {}
    };
  }

  private getUnsupportedCoverageClaim(
    context: SingleAgentContext,
    state: LoopState,
    completion: SingleAgentScanCompletion
  ) {
    const requestedLayers = context.request.scope.layers;
    const uncoveredLayers = requestedLayers.filter((layer) => {
      const coverage = state.coverageByLayer.get(layer);
      return !coverage || coverage.coverageStatus !== "covered";
    });
    const combinedText = [
      completion.summary,
      completion.residualRisk,
      completion.recommendedNextStep,
      completion.stopReason
    ].join(" ").toLowerCase();
    const claimsFullCoverage =
      combinedText.includes("all requested layers")
      || combinedText.includes("l1-l7")
      || combinedText.includes("coverage_complete")
      || combinedText.includes("fully covered");

    if (!claimsFullCoverage || uncoveredLayers.length === 0) {
      return null;
    }

    return {
      summary: `The closeout includes a coverage claim that is not supported by persisted layer evidence for ${uncoveredLayers.join(", ")}.`,
      detail: `Persisted coverage does not show these requested layers as covered: ${uncoveredLayers.join(", ")}. The closeout must describe partial coverage and residual risk instead of claiming full-stack completion.`,
      unsupportedLayers: uncoveredLayers
    };
  }

  private async emitWorkflowEvent(context: SingleAgentContext, event: WorkflowDebugEventInput) {
    await context.onWorkflowEvent?.({
      ...event,
      status: event.status ?? "completed",
      payload: {
        ...(event.payload ?? {})
      }
    });
  }

  private async audit(context: SingleAgentContext, action: string, details: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    await createAuditEntry({
      id: randomUUID(),
      scanId: context.scanId,
      timestamp,
      actor: "single-agent-scan",
      action,
      targetTacticId: context.rootTacticId,
      scopeValid: true,
      details
    });
    await context.onAudit?.({ action, details, timestamp });
  }

  private normalizeTarget(target: string) {
    return target.includes("://") ? target : `http://${target}`;
  }

  private resolveClaimedLayer(
    toolInput: Record<string, string | number | boolean | string[]>,
    context: SingleAgentContext
  ) {
    const layer = toolInput["layer"];
    if (typeof layer === "string" && layer in osiLayerNames) {
      return layer as ScanLayerCoverage["layer"];
    }

    return context.request.scope.layers[0] ?? "L7";
  }

  private getOsiReasoningChallenge(actionEnvelope: Record<string, unknown>) {
    const action = typeof actionEnvelope["action"] === "string" ? actionEnvelope["action"] : "";
    if (action !== "call_tool") {
      return null;
    }

    const reasoning = typeof actionEnvelope["reasoning"] === "string" ? actionEnvelope["reasoning"] : "";
    const match = /\b(L[1-7])\s*\(([^)]+)\)/i.exec(reasoning);
    if (!match) {
      return null;
    }

    const rawLayer = match[1];
    const rawName = match[2];
    if (!rawLayer || !rawName) {
      return null;
    }

    const layer = rawLayer.toUpperCase() as ScanLayerCoverage["layer"];
    const claimedName = rawName.replace(/\s+layer$/i, "").trim().toLowerCase();
    const canonicalName = osiLayerNames[layer].toLowerCase();
    if (claimedName === canonicalName) {
      return null;
    }

    return {
      layer,
      summary: `The reasoning uses ${layer} (${rawName}), but the canonical OSI name for ${layer} is ${osiLayerNames[layer]}.`,
      detail: `The run remains prompt-driven, so the claimed layer is preserved for execution and coverage. Adjust the next action so the layer label and reasoning match the canonical OSI model: L1 Physical, L2 Data Link, L3 Network, L4 Transport, L5 Session, L6 Presentation, L7 Application.`,
      feedback: `Your OSI reasoning is inconsistent: ${layer} is ${osiLayerNames[layer]}, not ${rawName}. Keep the run prompt-driven, but correct the layer naming in your next action.`
    };
  }

  private assertProvider(provider: StoredAiProvider | null, llm: ScanLlmConfig | undefined): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "AI provider not found for the selected agent.");
    }
    if (llm && llm.provider !== provider.kind) {
      throw new RequestError(400, "LLM override provider must match the selected agent provider.");
    }
    if (provider.kind === "anthropic" && !provider.apiKey) {
      throw new RequestError(400, "Single-agent scans require an Anthropic API key when the selected agent uses an Anthropic provider.");
    }
    if (provider.kind === "local" && !(llm?.baseUrl ?? provider.baseUrl)) {
      throw new RequestError(400, "Single-agent scans require a base URL when the selected agent uses a local provider.");
    }
  }
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function mergedCoveredValue(left: ScanLayerCoverage["coverageStatus"], right: ScanLayerCoverage["coverageStatus"]) {
  return coverageRank[left] > coverageRank["not_covered"] || coverageRank[right] > coverageRank["not_covered"];
}
