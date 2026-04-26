import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import type { OsiLayer, Scan, Workflow, WorkflowLiveModelOutput, WorkflowReportedFinding, WorkflowRun, WorkflowStage, WorkflowStageCompletionRule, WorkflowStageResult, WorkflowTraceEvent } from "@synosec/contracts";
import { getWorkflowReportedFindings, workflowFindingSubmissionSchema } from "@synosec/contracts";
import { z } from "zod";
import { createScan, getScan } from "@/engine/scans/index.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { FixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";
import { getSemanticFamilyDefinition } from "@/modules/ai-tools/index.js";
import { ToolBroker } from "./broker/tool-broker.js";
import { executeSemanticFamilyTool } from "./semantic-family-tool-executor.js";
import {
  attachEvidenceReferences,
  enrichWorkflowFindingDetails,
  inferLayer,
  normalizeToolInput,
  parseExecutionTarget,
  truncate,
  validateFindingEvidenceReferences,
  verifyFindingEvidence
} from "./workflow-execution.utils.js";
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
import { createLanguageModelFromRuntime } from "./language-model-factory.js";

export class DefaultWorkflowStageExecutor implements WorkflowStageRunner {
  private readonly broker: ToolBroker;
  private static readonly TARGET_CONTEXT_SUFFIX = [
    "Runtime target context:",
    "Target: {{target.name}}",
    "Target URL: {{target.url}}"
  ].join("\n");
  private static readonly SYSTEM_PROTOCOL_SUFFIX = [
    "Workflow execution contract:",
    "Use only the approved tools and built-in workflow actions exposed for this run.",
    "Required action order: run evidence tools first, then call report_finding for supported weaknesses, then reference returned finding ids in relationships or handoff attack paths, then call complete_run last.",
    "Report concrete evidence-backed findings with report_finding. report_finding returns the finding id.",
    "Do not report a finding unless the quote is traceable to a persisted tool result and contains concrete proof details.",
    "Prefer at most four strong findings. Stop once the main compromise path is proven.",
    "complete_run does not create findings and cannot satisfy missing evidence, missing finding, or missing chain requirements.",
    "If complete_run is rejected, call the missing required actions or evidence tools before trying completion again.",
    "When requireChainedFindings is enabled, satisfy it through finding relationship fields, chain metadata, or a handoff attack path referencing finding ids.",
    "End every run explicitly with complete_run."
  ].join("\n");

  constructor(
    private readonly ports: WorkflowRuntimePorts,
    private readonly preflight: WorkflowRunPreflight,
    private readonly writer: WorkflowRunWriterPort
  ) {
    this.broker = new ToolBroker({ broadcast: () => undefined });
  }

  async run(context: WorkflowStageExecutionContext): Promise<WorkflowStageExecutionOutcome> {
    const { workflow, run, stage, targetRecord, constraintSet } = context;
    const { agent, runtime, target, tools, excludedTools } = await this.preflight.loadStageDependencies(stage, targetRecord, constraintSet, workflow.executionKind);

    let currentRun = run;
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
        this.writer.createEvent(
          currentRun,
          workflow.id,
          stage.id,
          currentRun.events.length,
          type,
          status,
          payload,
          title,
          summary,
          detail,
          options?.rawStreamPartType
        ),
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
    const targetContextPrompt = this.renderPromptTemplate(DefaultWorkflowStageExecutor.TARGET_CONTEXT_SUFFIX, {
      workflowName: workflow.name,
      stageLabel: stage.label,
      stageObjective: stage.objective,
      targetName: targetRecord.name,
      targetUrl: target.baseUrl
    });
    const systemPrompt = [
      renderedStageSystemPrompt,
      targetContextPrompt,
      DefaultWorkflowStageExecutor.SYSTEM_PROTOCOL_SUFFIX
    ].join("\n\n");
    const builtinLifecycleToolNames = new Set([
      "log_progress",
      "report_finding",
      "complete_run"
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
              observations: brokerResult.observations,
              observationKeys: brokerResult.observations.map((observation) => observation.key),
              observationSummaries: brokerResult.observations.map((observation) => observation.summary),
              outputPreview: truncate(
                brokerResult.observations[0]?.summary
                  ?? toolRun.statusReason
                  ?? toolRun.output
                  ?? `${tool.name} ${toolRun.status}.`
              ),
              fullOutput: toolRun.output ?? toolRun.statusReason ?? "",
              commandPreview: toolRun.commandPreview,
              ...(toolRun.exitCode === undefined ? {} : { exitCode: toolRun.exitCode }),
              usedToolId: tool.id,
              usedToolName: tool.name,
              fallbackUsed: false,
              attempts: [{
                toolId: tool.id,
                toolName: tool.name,
                status: toolRun.status,
                ...(toolRun.exitCode === undefined ? {} : { exitCode: toolRun.exitCode }),
                ...(toolRun.statusReason ? { statusReason: toolRun.statusReason } : {}),
                outputExcerpt: truncate(toolRun.output ?? toolRun.statusReason ?? "", 400),
                selected: true
              }]
            };
            executedResults.push(result);

            return {
              toolRunId: toolRun.id,
              toolId: tool.id,
              toolName: tool.id,
              status: toolRun.status,
              outputPreview: result.outputPreview,
              rawOutput: result.fullOutput,
              observations: result.observations,
              observationSummaries: result.observationSummaries,
              usedToolId: result.usedToolId,
              usedToolName: result.usedToolName,
              fallbackUsed: result.fallbackUsed,
              attempts: result.attempts
            };
          }
        }];
      }

      if (tool.executorType !== "builtin" || !tool.builtinActionKey || builtinLifecycleToolNames.has(tool.builtinActionKey)) {
        return [];
      }

      const familyDefinition = getSemanticFamilyDefinition(tool.builtinActionKey);
      if (!familyDefinition) {
        throw new RequestError(500, `Workflow capability tool ${tool.name} is missing its execution definition.`);
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
    const toolCallsById = new Map<string, {
      toolName: string;
      toolId: string | null;
    }>();
    const persistedToolResultIds = new Set<string>();

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
          { name: "log_progress", description: "Persist a short operator-visible progress update in the workflow transcript. Use this before or after meaningful tool calls to explain the current action or decision in one concise sentence. Provide `message`. Returns acceptance only; it does not create evidence, findings, or attack-path links." },
          { name: "report_finding", description: "Persist one evidence-backed security finding. Run evidence tools first. Provide supported weakness details and persisted evidence quotes. Returns the finding id; use that id in related findings and handoff attack paths." },
          { name: "complete_run", description: "Finish the workflow run last, after required evidence, report_finding calls, finding ids, and any handoff attack paths have been submitted. Use this only as the final action. Provide `summary`, `recommendedNextStep`, `residualRisk`, and optional `handoff`. It does not create findings and cannot satisfy missing evidence, finding, or chain requirements." }
        ]
      }
    ]);

    await appendEvent("system_message", "completed", {
      title: "Rendered system prompt",
      summary: "Persisted the exact system prompt delivered to the workflow model, including engine-generated target and runtime contract context.",
      body: systemPrompt,
      messageKind: "prompt",
      promptKind: "system",
      promptSourceLabel: "Workflow-owned editable system prompt plus engine-generated target context and runtime contract.",
      promptCharCount: systemPrompt.length,
      fullPrompt: systemPrompt
    }, "Rendered system prompt", "Persisted the exact system prompt delivered to the workflow model.", systemPrompt);

    if (toolContext) {
      await appendEvent("system_message", "completed", {
        title: "Tool context",
        summary: "Persisted the tool inventory exposed to the workflow model.",
        body: toolContext
      }, "Tool context", "Persisted the tool inventory exposed to the workflow model.", toolContext);
    }

    if (excludedTools.length > 0) {
      const excludedToolSummary = excludedTools.map((tool) => `${tool.name}: ${tool.reason}`).join("\n");
      await appendEvent("system_message", "completed", {
        title: "Policy-filtered tools",
        summary: `Excluded ${excludedTools.length} tool${excludedTools.length === 1 ? "" : "s"} for this target run because they were not compatible with the active target constraints.`,
        excludedTools
      }, "Policy-filtered tools", `Excluded ${excludedTools.length} incompatible tool${excludedTools.length === 1 ? "" : "s"} for this target run.`, excludedToolSummary);
    }

    const scan = createWorkflowScan(currentRun, constraintSet);
    await this.ensureWorkflowScan(scan, targetRecord.id, agent.id);
    const executedResults: ExecutedToolResult[] = [];
    const reportedFindings = new Map(getWorkflowReportedFindings(currentRun).map((finding) => [finding.id, finding]));
    let terminalState: PipelineTerminalState | null = null;
    let liveModelOutput: WorkflowLiveModelOutput | null = null;
    const abortController = new AbortController();
    const liveOutputSource: WorkflowLiveModelOutput["source"] = "hosted";

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

    const formatFindingResult = (rawOutput: unknown) => {
      if (!rawOutput || typeof rawOutput !== "object" || Array.isArray(rawOutput)) {
        return null;
      }

      const output = rawOutput as Record<string, unknown>;
      const title = typeof output["title"] === "string" ? output["title"].trim() : "";
      const host = typeof output["host"] === "string" ? output["host"].trim() : "";
      const severity = typeof output["severity"] === "string" ? output["severity"].trim().toUpperCase() : "UNKNOWN";
      if (!title || !host) {
        return null;
      }

      return {
        summary: `Recorded ${severity} finding: ${title} on ${host}.`,
        detail: JSON.stringify(output, null, 2)
      };
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
        description: "Persist a short operator-visible progress update in the workflow transcript. Use this before or after meaningful tool calls to explain the current action or decision in one concise sentence. Provide `message`. Returns acceptance only; it does not create evidence, findings, or attack-path links.",
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
        description: "Persist one evidence-backed security finding. Run evidence tools first. Provide supported weakness details and persisted evidence quotes. Returns the finding id; use that id in related findings and handoff attack paths.",
        inputSchema: workflowFindingSubmissionSchema,
        execute: async (rawInput) => {
          const findingInput = attachEvidenceReferences(
            workflowFindingSubmissionSchema.parse(rawInput),
            executedResults
          );
          validateRelatedFindingSubmission(findingInput);
          const referenceError = validateFindingEvidenceReferences(findingInput, executedResults);
          if (referenceError) {
            throw new RequestError(400, referenceError);
          }
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

          const enrichedDetails = enrichWorkflowFindingDetails({
            title: findingInput.title,
            target: findingInput.target,
            evidence: findingInput.evidence,
            reproduction: findingInput.reproduction
          }, executedResults, target);
          const verifiedInput = {
            ...findingInput,
            ...enrichedDetails
          };
          const verification = verifyFindingEvidence(verifiedInput, executedResults);
          if (verification.validationStatus === "rejected") {
            throw new RequestError(400, verification.reason);
          }

          const finding: WorkflowReportedFinding = createWorkflowReportedFinding({
            runId: currentRun.id,
            submission: {
              ...verifiedInput,
              validationStatus: verification.validationStatus,
              confidence: verification.confidence,
              confidenceReason: findingInput.confidenceReason
                ? `${findingInput.confidenceReason} ${verification.reason}`.trim()
                : verification.reason
            }
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
        description: "Finish the workflow run last, after required evidence, report_finding calls, finding ids, and any handoff attack paths have been submitted. Use this only as the final action. Provide `summary`, `recommendedNextStep`, `residualRisk`, and optional `handoff`. It does not create findings and cannot satisfy missing evidence, finding, or chain requirements.",
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
          const completionAssertions = evaluateCompletionAssertions({
            completionRule: stage.completionRule,
            executedResults,
            findings: [...reportedFindings.values()],
            handoff: completion.handoff ?? null
          });
          if (completionAssertions.enabled) {
            await appendEvent("verification", completionAssertions.failures.length > 0 ? "failed" : "completed", {
              messageKind: completionAssertions.failures.length > 0 ? "challenge" : "accept",
              action: "readme_coverage_assertions",
              assertions: completionAssertions.assertions,
              failures: completionAssertions.failures
            }, "README coverage assertions", completionAssertions.failures.length > 0
              ? `Missing coverage assertion: ${completionAssertions.failures[0]}`
              : "The run satisfied the configured README coverage assertions.", JSON.stringify(completionAssertions.assertions, null, 2));
          }
          if (completionAssertions.failures.length > 0) {
            throw new RequestError(400, `Workflow completion assertions failed: ${completionAssertions.failures.join("; ")}`);
          }
          const completionDetail = [
            `Agent summary: ${completion.summary}`,
            `Recommended next step: ${completion.recommendedNextStep}`,
            `Residual risk: ${completion.residualRisk}`
          ].join("\n");
          await appendEvent("verification", "completed", {
            messageKind: "accept",
            action: "complete_run",
            summary: "The agent finished pen testing.",
            detail: completionDetail
          }, "Run completion accepted", "The agent finished pen testing.", completionDetail);
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
      })
    };

    const result = streamText({
      model: this.createLanguageModel(runtime),
      system: systemPrompt,
      prompt: "Proceed.",
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
          case "start-step": {
            const requestBody = part.request?.body;
            const messages = Array.isArray(requestBody?.messages) ? requestBody.messages : [];
            for (const message of messages) {
              const content = Array.isArray(message?.content) ? message.content : [];
              for (const item of content) {
                if (item?.type !== "tool_result" || typeof item?.tool_use_id !== "string" || persistedToolResultIds.has(item.tool_use_id)) {
                  continue;
                }
                const toolCall = toolCallsById.get(item.tool_use_id);
                if (!toolCall || toolCall.toolName === "log_progress") {
                  continue;
                }
                const rawContent = typeof item.content === "string"
                  ? item.content
                  : JSON.stringify(item.content, null, 2);
                await appendEvent("tool_result", item.is_error ? "failed" : "completed", {
                  toolCallId: item.tool_use_id,
                  toolName: toolCall.toolName,
                  toolId: toolCall.toolId,
                  output: item.content,
                  summary: rawContent,
                  outputPreview: rawContent,
                  fullOutput: rawContent,
                  commandPreview: null,
                  exitCode: null,
                  observations: [],
                  observationRecords: [],
                  usedToolId: null,
                  usedToolName: null,
                  fallbackUsed: false,
                  attempts: []
                }, `${toolCall.toolName} returned`, rawContent, rawContent, undefined, {
                  rawStreamPartType: "tool-result"
                });
                persistedToolResultIds.add(item.tool_use_id);
              }
            }
            await appendEvent("system_message", "completed", {
              request: requestBody,
              warnings: part.warnings
            }, "Model step started", "Started a new model step.", null, undefined, {
              rawStreamPartType: part.type
            });
            break;
          }
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
            toolCallsById.set(part.toolCallId, {
              toolName: part.toolName,
              toolId: evidenceToolByName.get(part.toolName)?.id ?? null
            });
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
            const findingResult = part.toolName === "report_finding" ? formatFindingResult(part.output) : null;
            const resultStatus = matchingResult?.status === "failed"
              ? "failed"
              : "completed";
            const outputPreview = matchingResult?.outputPreview
              ?? findingResult?.summary
              ?? `${part.toolName} completed.`;
            const fullOutput = matchingResult?.fullOutput
              ?? findingResult?.detail
              ?? null;
            persistedToolResultIds.add(part.toolCallId);
            await appendEvent("tool_result", resultStatus, {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: matchingResult?.toolId ?? null,
              output: part.output,
              summary: outputPreview,
              outputPreview,
              fullOutput,
              commandPreview: matchingResult?.commandPreview ?? null,
              exitCode: matchingResult?.exitCode ?? null,
              observations: matchingResult?.observationSummaries ?? [],
              observationRecords: matchingResult?.observations ?? [],
              usedToolId: matchingResult?.usedToolId ?? null,
              usedToolName: matchingResult?.usedToolName ?? null,
              fallbackUsed: matchingResult?.fallbackUsed ?? false,
              attempts: matchingResult?.attempts ?? []
            }, `${part.toolName} returned`, outputPreview, fullOutput, undefined, {
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
            const abortReason = typeof part.reason === "string" ? part.reason : "workflow-aborted";
            const isExpectedCompletion = abortReason === "workflow-completed";
            await appendEvent("verification", "completed", {
              message: abortReason
            }, isExpectedCompletion ? "Model stream closed" : "Model stream aborted", isExpectedCompletion ? "workflow-completed" : abortReason, null, undefined, {
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
      throw new RequestError(500, "The model finished without calling complete_run.");
    }

    const finalTerminalState = terminalState as PipelineTerminalState;
    const stageResult: WorkflowStageResult = {
      status: "completed",
      summary: finalTerminalState.summary,
      findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
      recommendedNextStep: finalTerminalState.recommendedNextStep,
      residualRisk: finalTerminalState.residualRisk,
      handoff: finalTerminalState.handoff,
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

  private createLanguageModel(runtime: FixedAiRuntime): LanguageModel {
    return createLanguageModelFromRuntime(runtime);
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

function validateRelatedFindingSubmission(findingInput: z.infer<typeof workflowFindingSubmissionSchema>) {
  const hasRelationshipIds = findingInput.derivedFromFindingIds.length > 0
    || findingInput.relatedFindingIds.length > 0
    || findingInput.enablesFindingIds.length > 0;
  const hasChain = Boolean(findingInput.chain);
  const participatesInPath = hasRelationshipIds || hasChain;
  if (!participatesInPath) {
    return;
  }

  if (!findingInput.explanationSummary?.trim()) {
    throw new RequestError(400, "Path-linked findings must include explanationSummary.");
  }

  if (!findingInput.confidenceReason?.trim()) {
    throw new RequestError(400, "Path-linked findings must include confidenceReason.");
  }

  if (hasRelationshipIds) {
    const explanations = findingInput.relationshipExplanations;
    const hasRelationshipExplanation = Boolean(
      explanations?.derivedFrom?.trim()
      || explanations?.relatedTo?.trim()
      || explanations?.enables?.trim()
    );
    if (!hasRelationshipExplanation) {
      throw new RequestError(400, "Path-linked findings must explain at least one reported relationship.");
    }
  }
}

function evaluateCompletionAssertions(input: {
  completionRule: WorkflowStageCompletionRule;
  executedResults: ExecutedToolResult[];
  findings: WorkflowReportedFinding[];
  handoff: Record<string, unknown> | null;
}) {
  const successfulToolResults = input.executedResults.filter((result) =>
    result.status === "completed"
    && (result.observations.length > 0 || result.fullOutput.trim().length > 0 || result.outputPreview.trim().length > 0)
  );
  const evidenceBackedFindings = input.findings.filter((finding) =>
    finding.evidence.length > 0
    && ["single_source", "cross_validated", "reproduced"].includes(finding.validationStatus)
  );
  const coveredLayers = getCoveredWorkflowLayers(successfulToolResults, input.findings);
  const hasChainedFindings = input.findings.some((finding) =>
    finding.derivedFromFindingIds.length > 0
    || finding.relatedFindingIds.length > 0
    || finding.enablesFindingIds.length > 0
    || Boolean(finding.chain)
  ) || handoffHasAttackPath(input.handoff);

  const assertions = {
    reachableSurface: {
      required: input.completionRule.requireReachableSurface || input.completionRule.requireToolCall,
      passed: successfulToolResults.length > 0,
      evidenceCount: successfulToolResults.length
    },
    evidenceBackedWeaknesses: {
      required: input.completionRule.requireEvidenceBackedWeakness || input.completionRule.minFindings > 0 || !input.completionRule.allowEmptyResult,
      passed: evidenceBackedFindings.length >= Math.max(1, input.completionRule.minFindings),
      findingCount: evidenceBackedFindings.length,
      requiredFindingCount: Math.max(1, input.completionRule.minFindings)
    },
    osiCoverageStatus: {
      required: input.completionRule.requireOsiCoverageStatus,
      passed: coveredLayers.length > 0,
      coveredLayers
    },
    chainedFindings: {
      required: input.completionRule.requireChainedFindings,
      passed: hasChainedFindings,
      linkedFindingCount: input.findings.filter((finding) =>
        finding.derivedFromFindingIds.length > 0
        || finding.relatedFindingIds.length > 0
        || finding.enablesFindingIds.length > 0
        || Boolean(finding.chain)
      ).length
    }
  };

  const failures = [
    assertions.reachableSurface.required && !assertions.reachableSurface.passed
      ? "reachable surface was not demonstrated by a successful evidence tool result"
      : null,
    assertions.evidenceBackedWeaknesses.required && !assertions.evidenceBackedWeaknesses.passed
      ? `evidence-backed weaknesses did not meet the required finding count (${assertions.evidenceBackedWeaknesses.findingCount}/${assertions.evidenceBackedWeaknesses.requiredFindingCount})`
      : null,
    assertions.osiCoverageStatus.required && !assertions.osiCoverageStatus.passed
      ? "OSI coverage status was not demonstrated by any successful tool result or reported finding"
      : null,
    assertions.chainedFindings.required && !assertions.chainedFindings.passed
      ? "chained findings were not demonstrated through relationship fields, chain metadata, or attack-path handoff"
      : null
  ].filter((failure): failure is string => Boolean(failure));

  const enabled = Object.values(assertions).some((assertion) => assertion.required);

  return { enabled, assertions, failures };
}

function getCoveredWorkflowLayers(
  successfulToolResults: ExecutedToolResult[],
  findings: WorkflowReportedFinding[]
): OsiLayer[] {
  const layers = new Set<OsiLayer>();
  for (const result of successfulToolResults) {
    layers.add(result.toolRequest.layer);
  }
  for (const finding of findings) {
    layers.add(inferLayerForWorkflowFinding(finding));
  }
  return [...layers].sort();
}

function inferLayerForWorkflowFinding(finding: WorkflowReportedFinding): OsiLayer {
  switch (finding.type) {
    case "service_exposure":
      return "L4";
    case "auth_weakness":
      return "L5";
    case "tls_weakness":
      return "L6";
    default:
      return "L7";
  }
}

function handoffHasAttackPath(handoff: Record<string, unknown> | null) {
  if (!handoff) {
    return false;
  }

  const attackPaths = handoff["attackPaths"];
  if (!Array.isArray(attackPaths)) {
    return false;
  }

  return attackPaths.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }
    const findingIds = (entry as Record<string, unknown>)["findingIds"];
    return Array.isArray(findingIds) && findingIds.length > 1;
  });
}
