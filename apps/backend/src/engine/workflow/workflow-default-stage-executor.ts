import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import type { Scan, Workflow, WorkflowLiveModelOutput, WorkflowReportedFinding, WorkflowRun, WorkflowStage, WorkflowStageResult, WorkflowTraceEvent } from "@synosec/contracts";
import { getWorkflowReportedFindings, workflowFindingSubmissionSchema } from "@synosec/contracts";
import { z } from "zod";
import { createScan, getScan } from "@/engine/scans/index.js";
import { RequestError } from "@/shared/http/request-error.js";
import { getSemanticFamilyDefinition } from "@/modules/ai-tools/index.js";
import { ToolBroker } from "./broker/tool-broker.js";
import { executeSemanticFamilyTool } from "./semantic-family-tool-executor.js";
import { inferLayer, normalizeToolInput, parseExecutionTarget, truncate } from "./workflow-execution.utils.js";
import { createWorkflowReportedFinding } from "./workflow-finding-factory.js";
import type {
  ExecutedToolResult,
  PipelineTerminalState,
  WorkflowRuntimePorts,
  WorkflowStageExecutionContext,
  WorkflowStageExecutionOutcome,
  WorkflowStageRunner,
  WorkflowRunWriterPort
} from "./workflow-runtime-types.js";
import { createWorkflowScan } from "./workflow-runtime-types.js";
import { WorkflowRunPreflight } from "./workflow-run-preflight.js";

export class DefaultWorkflowStageExecutor implements WorkflowStageRunner {
  private readonly broker: ToolBroker;
  private static readonly SYSTEM_PROTOCOL_SUFFIX = [
    "Workflow execution contract:",
    "Use only the approved tools and built-in workflow actions exposed for this run.",
    "Report concrete evidence-backed findings with report_finding.",
    "End every run explicitly with complete_run or fail_run."
  ].join("\n");

  private describePromptSource(input: {
    kind: "system";
    value: string;
  }) {
    return {
      sourceLabel: "Workflow-owned editable system prompt plus runtime contract.",
      compactBody: `System prompt\n\nWorkflow-owned editable prompt. ${input.value.length} chars. Inspect or edit it from Edit Prompts.`
    };
  }

  constructor(
    private readonly ports: WorkflowRuntimePorts,
    private readonly preflight: WorkflowRunPreflight,
    private readonly writer: WorkflowRunWriterPort
  ) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
  }

  async run(context: WorkflowStageExecutionContext): Promise<WorkflowStageExecutionOutcome> {
    const { workflow, run, stage, targetRecord, constraintSet } = context;
    const { agent, provider, target, tools } = await this.preflight.loadStageDependencies(stage, targetRecord, constraintSet, workflow.executionKind);

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
      currentRun = await this.writer.appendEvent(
        currentRun,
        this.writer.createEvent(currentRun, workflow.id, stage.id, ord++, type, status, payload, title, summary, detail, options?.rawStreamPartType),
        patch,
        options?.liveModelOutput
      );
      return currentRun;
    };

    const renderedStageSystemPrompt = this.renderPromptTemplate(stage.stageSystemPrompt, {
      workflowName: workflow.name,
      stageLabel: stage.label,
      stageObjective: stage.objective,
      targetName: targetRecord.name,
      targetUrl: target.baseUrl
    });
    const systemPrompt = [
      renderedStageSystemPrompt,
      DefaultWorkflowStageExecutor.SYSTEM_PROTOCOL_SUFFIX
    ].join("\n\n");
    const builtinLifecycleToolNames = new Set([
      "log_progress",
      "report_finding",
      "complete_run",
      "fail_run",
      "deep_analysis",
      "attack_chain_correlation"
    ]);
    const evidenceToolEntries = tools.flatMap((tool) => {
      if (tool.executorType === "bash" && tool.bashSource) {
        return [{
          exposedName: tool.id,
          tool,
          description: tool.description ?? tool.name,
          execute: async (rawInput: unknown) => {
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
              toolName: tool.id,
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
              toolName: tool.id,
              status: toolRun.status,
              outputPreview: result.outputPreview,
              observations: result.observations
            };
          }
        }];
      }

      if (tool.executorType !== "builtin" || !tool.builtinActionKey || builtinLifecycleToolNames.has(tool.builtinActionKey)) {
        return [];
      }

      const familyDefinition = getSemanticFamilyDefinition(tool.builtinActionKey);
      if (!familyDefinition) {
        throw new RequestError(500, `Workflow builtin tool ${tool.name} is missing its semantic family definition.`);
      }

      return [{
        exposedName: tool.builtinActionKey,
        tool,
        description: tool.description ?? tool.name,
        execute: async (rawInput: unknown) => {
          const familyExecution = await executeSemanticFamilyTool({
            broker: this.broker,
            toolRuntime: this.ports.toolRuntime,
            familyTool: tool,
            familyDefinition,
            target,
            scan,
            tacticId: workflow.id,
            agentId: agent.id,
            constraintSet
          }, rawInput);
          executedResults.push(familyExecution.result);
          return familyExecution.response;
        }
      }];
    });
    const evidenceToolByName = new Map(evidenceToolEntries.map((entry) => [entry.exposedName, entry.tool] as const));

    const toolContext = this.formatToolContextSections([
      {
        title: "Evidence tools",
        tools: evidenceToolEntries.map((entry) => ({
            name: entry.exposedName,
            description: entry.description
          }))
      },
      {
        title: "Built-in actions",
        tools: [
          { name: "log_progress", description: "Persist one short operator-visible progress update for the workflow transcript." },
          { name: "report_finding", description: "Persist one evidence-backed workflow finding." },
          { name: "complete_run", description: "Submit the current workflow stage result." },
          { name: "fail_run", description: "Finish the workflow stage as failed." }
        ]
      }
    ]);

    const systemPromptDescriptor = this.describePromptSource({
      kind: "system",
      value: systemPrompt
    });
    await appendEvent("system_message", "completed", {
      title: "Rendered system prompt",
      summary: "Persisted the workflow pipeline system prompt.",
      body: systemPromptDescriptor.compactBody,
      messageKind: "prompt",
      promptKind: "system",
      promptSourceLabel: systemPromptDescriptor.sourceLabel,
      promptCharCount: systemPrompt.length
    }, "Rendered system prompt", "Persisted the workflow pipeline system prompt.", systemPromptDescriptor.compactBody);

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

    const evidenceTools = Object.fromEntries(evidenceToolEntries.map((entry) => [
      entry.exposedName,
      createSdkTool({
        description: entry.description,
        inputSchema: z.object({}).catchall(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
        execute: entry.execute
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

          const finding: WorkflowReportedFinding = createWorkflowReportedFinding({
            runId: currentRun.id,
            submission: findingInput
          });
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
      prompt: "",
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
              toolId: evidenceToolByName.get(part.toolName)?.id ?? null,
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
      if (!(error instanceof Error && error.name === "AbortError")) {
        await appendEvent("verification", "failed", {
          message: error instanceof Error ? error.message : String(error)
        }, "Workflow model execution failed", error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack ?? error.message : String(error));
        throw error;
      }
    }

    if (!terminalState) {
      throw new RequestError(500, "The model finished without calling complete_run or fail_run.");
    }

    const finalTerminalState = terminalState as PipelineTerminalState;
    let stageResult: WorkflowStageResult;
    if (finalTerminalState.status === "completed") {
      stageResult = {
        status: "completed",
        summary: finalTerminalState.summary,
        findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
        recommendedNextStep: finalTerminalState.recommendedNextStep,
        residualRisk: finalTerminalState.residualRisk,
        handoff: finalTerminalState.handoff,
        submittedAt: new Date().toISOString()
      };
    } else {
      stageResult = {
        status: "blocked",
        summary: finalTerminalState.summary,
        findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
        recommendedNextStep: finalTerminalState.reason,
        residualRisk: finalTerminalState.reason,
        handoff: null,
        submittedAt: new Date().toISOString()
      };
    }

    currentRun = await appendEvent(
      "stage_result_submitted",
      finalTerminalState.status === "completed" ? "completed" : "failed",
      { stageResult },
      `Stage result submitted: ${stage.label}`,
      stageResult.summary,
      stageResult.residualRisk
    );

    return {
      run: currentRun,
      result: stageResult
    };
  }

  private renderPromptTemplate(
    template: string,
    values: {
      workflowName: string;
      stageLabel: string;
      stageObjective: string;
      targetName: string;
      targetUrl: string;
    }
  ) {
    const supportedTokens = new Map<string, string>([
      ["workflow.name", values.workflowName],
      ["stage.label", values.stageLabel],
      ["stage.objective", values.stageObjective],
      ["target.name", values.targetName],
      ["target.url", values.targetUrl]
    ]);

    return template.replace(/{{\s*([^}]+?)\s*}}/g, (match, tokenName: string) => {
      const normalizedToken = tokenName.trim();
      const replacement = supportedTokens.get(normalizedToken);
      if (replacement === undefined) {
        throw new RequestError(500, `Unsupported workflow prompt token: ${match}`);
      }
      return replacement;
    });
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

  private createAnthropicLanguageModel(provider: { apiKey: string | null; baseUrl: string | null }, model: string): LanguageModel {
    const anthropic = createAnthropic({
      apiKey: provider.apiKey as string,
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {})
    });

    return anthropic(model);
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
}
