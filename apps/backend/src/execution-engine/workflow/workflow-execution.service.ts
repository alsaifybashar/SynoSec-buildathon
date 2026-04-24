import { randomUUID } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import type {
  AiTool,
  Scan,
  ToolRequest,
  ToolRun,
  Workflow,
  WorkflowReportedFinding,
  WorkflowRun,
  WorkflowTraceEvent
} from "@synosec/contracts";
import { workflowFindingSubmissionSchema } from "@synosec/contracts";
import { z } from "zod";
import type { WorkflowRunStream } from "@/execution-engine/workflow/workflow-run-stream.js";
import { RequestError } from "@/shared/http/request-error.js";
import { compileToolRequestFromDefinition } from "@/features/ai-tools/index.js";
import type { AiAgentsRepository } from "@/features/ai-agents/index.js";
import type { AiProvidersRepository, StoredAiProvider } from "@/features/ai-providers/index.js";
import type { AiToolsRepository } from "@/features/ai-tools/index.js";
import type { ApplicationsRepository } from "@/features/applications/index.js";
import type { RuntimesRepository } from "@/features/runtimes/index.js";
import { createScan, getScan } from "@/features/scans/index.js";
import { ToolBroker } from "./broker/tool-broker.js";
import { inferLayer, normalizeToolInput, parseExecutionTarget, parseTarget, truncate } from "./workflow-execution.utils.js";
import { WorkflowRunEventPublisher } from "./workflow-run-event-publisher.js";
import type { WorkflowsRepository } from "@/features/workflows/workflows.repository.js";

type ExecutedToolResult = {
  toolId: string;
  toolName: string;
  toolInput: Record<string, string | number | boolean | string[]>;
  toolRequest: ToolRequest;
  toolRun: ToolRun;
  observations: string[];
  outputPreview: string;
  fullOutput: string;
};

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
    private readonly workflowRunStream: WorkflowRunStream
  ) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
    this.eventPublisher = new WorkflowRunEventPublisher(this.workflowsRepository, this.workflowRunStream);
  }

  async startRun(workflowId: string) {
    const workflow = await this.workflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const agent = await this.aiAgentsRepository.getById(workflow.agentId);
    if (!agent) {
      throw new RequestError(400, "Workflow agent not found.");
    }

    const provider = await this.aiProvidersRepository.getStoredById(agent.providerId);
    this.assertProviderSupportsWorkflowExecution(provider);

    const run = await this.workflowsRepository.createRun(workflowId);
    if (!run) {
      throw new RequestError(404, "Workflow not found.");
    }

    this.eventPublisher.publishSnapshot(run);
    void this.executePipelineRun(workflow, run).catch(async (error) => {
      await this.failWorkflowRunAfterUnhandledError(run.id, error);
    });
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
    } catch (updateError) {
      console.error("Failed to persist workflow run failure state.", updateError);
    }

    console.error("Unhandled workflow pipeline execution failure.", detail);
  }

  private buildSystemPrompt(input: PipelineContext) {
    return [
      input.agent.systemPrompt,
      "You are executing a single transparent security data pipeline.",
      "Use approved evidence tools to collect facts.",
      "Register every concrete finding with the report_finding tool.",
      "End the run with complete_run when finished or fail_run when blocked or invalid.",
      "Do not emit JSON action envelopes in plain text.",
      "Do not claim a finding unless it is backed by tool evidence.",
      "Prefer concise updates and explicit evidence-backed conclusions."
    ].join("\n\n");
  }

  private buildTaskPrompt(input: PipelineContext) {
    const evidenceTools = input.tools.filter((tool) => tool.executorType === "bash");
    const builtinActions = input.tools.filter((tool) => tool.executorType === "builtin");

    return [
      `Workflow: ${input.workflow.name}`,
      `Objective: ${input.workflow.objective}`,
      `Application: ${input.application.name}`,
      `Target URL: ${input.target.baseUrl}`,
      input.runtime ? `Runtime: ${input.runtime.name} (${input.runtime.provider}, ${input.runtime.region})` : null,
      `Allowed evidence tools: ${evidenceTools.map((tool) => `${tool.id}=${tool.name}`).join(", ") || "none"}`,
      builtinActions.length > 0 ? `Visible built-in actions: ${builtinActions.map((tool) => `${tool.id}=${tool.name}`).join(", ")}` : null
    ].filter(Boolean).join("\n");
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
    detail: string | null = null
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
      payload: this.decorateTracePayload(type, payload),
      createdAt: new Date().toISOString()
    };
  }

  private async executePipelineRun(workflow: Workflow, run: WorkflowRun) {
    const [application, runtime, agent] = await Promise.all([
      this.applicationsRepository.getById(workflow.applicationId),
      workflow.runtimeId ? this.runtimesRepository.getById(workflow.runtimeId) : Promise.resolve(null),
      this.aiAgentsRepository.getById(workflow.agentId)
    ]);

    if (!application) {
      throw new RequestError(400, "Workflow application not found.");
    }
    if (!agent) {
      throw new RequestError(400, "Workflow agent not found.");
    }

    const provider = await this.aiProvidersRepository.getStoredById(agent.providerId);
    this.assertProviderSupportsWorkflowExecution(provider);

    const target = parseTarget(application.baseUrl);
    const tools = (
      await Promise.all(workflow.allowedToolIds.map((toolId) => this.aiToolsRepository.getById(toolId)))
    ).filter((candidate): candidate is AiTool => Boolean(candidate));

    const context: PipelineContext = {
      workflow,
      run,
      application,
      runtime,
      agent,
      provider,
      target,
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
      patch?: { status?: WorkflowRun["status"]; completedAt?: string | null }
    ) => {
      currentRun = await this.eventPublisher.appendEvent(
        currentRun,
        this.createEvent(currentRun, workflow.id, ord++, type, status, payload, title, summary, detail),
        patch
      );
      return currentRun;
    };

    const systemPrompt = this.buildSystemPrompt(context);
    const taskPrompt = this.buildTaskPrompt(context);
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

    const scan = createWorkflowScan(run, target);
    await this.ensureWorkflowScan(scan, context);
    const executedResults: ExecutedToolResult[] = [];
    const reportedFindings = new Map<string, WorkflowReportedFinding>();
    let terminalState: PipelineTerminalState | null = null;
    const abortController = new AbortController();

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
            requests: [request]
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
            observations: brokerResult.observations.map((observation) => observation.summary),
            outputPreview: truncate(toolRun.output ?? toolRun.statusReason ?? `${tool.name} completed.`),
            fullOutput: toolRun.output ?? toolRun.statusReason ?? ""
          };
          executedResults.push(result);

          return {
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
            }, "Model step started", "Started a new model step.");
            break;
          case "text":
            await appendEvent("model_decision", "running", {
              text: part.text
            }, "Model streamed text", truncate(part.text, 80), part.text);
            break;
          case "reasoning":
            await appendEvent("model_decision", "running", {
              text: part.text
            }, "Model streamed reasoning", truncate(part.text, 80), part.text);
            break;
          case "tool-call-streaming-start":
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName
            }, `Calling ${part.toolName}`, `Started streaming arguments for ${part.toolName}.`);
            break;
          case "tool-call-delta":
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              argsTextDelta: part.argsTextDelta
            }, `Calling ${part.toolName}`, `Streaming arguments for ${part.toolName}.`, part.argsTextDelta);
            break;
          case "tool-call":
            await appendEvent("tool_call", "running", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: part.toolName in evidenceTools ? part.toolName : null,
              input: JSON.stringify(part.input, null, 2)
            }, `Calling ${part.toolName}`, `Invoked ${part.toolName}.`, JSON.stringify(part.input, null, 2));
            break;
          case "tool-result": {
            const matchingResult = executedResults.find((candidate) => candidate.toolName === part.toolName && candidate.toolId === part.toolName)
              ?? executedResults.find((candidate) => candidate.toolName === part.toolName);
            await appendEvent("tool_result", part.toolName === "fail_run" ? "failed" : "completed", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: matchingResult?.toolId ?? null,
              output: part.output,
              summary: matchingResult?.outputPreview ?? `${part.toolName} completed.`,
              observations: matchingResult?.observations ?? []
            }, `${part.toolName} returned`, matchingResult?.outputPreview ?? `${part.toolName} completed.`, matchingResult?.fullOutput ?? null);
            break;
          }
          case "finish-step":
            await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
              finishReason: part.finishReason,
              rawFinishReason: part.rawFinishReason,
              usage: part.usage
            }, "Model step finished", `Step finished with reason: ${part.finishReason}.`);
            break;
          case "finish":
            await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
              finishReason: part.finishReason,
              rawFinishReason: part.rawFinishReason,
              totalUsage: part.totalUsage
            }, "Model stream finished", `Stream finished with reason: ${part.finishReason}.`);
            break;
          case "error":
            await appendEvent("verification", "failed", {
              message: part.error instanceof Error ? part.error.message : String(part.error),
              detail: part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error)
            }, "Model stream error", part.error instanceof Error ? part.error.message : String(part.error), part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error));
            break;
          case "abort":
            await appendEvent("verification", "completed", {
              message: typeof part.reason === "string" ? part.reason : "workflow-aborted"
            }, "Model stream aborted", typeof part.reason === "string" ? part.reason : "workflow-aborted");
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
