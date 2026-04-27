import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import type { Scan, Workflow, WorkflowAttackVectorSubmission, WorkflowLiveModelOutput, WorkflowReportedAttackVector, WorkflowReportedFinding, WorkflowRun, WorkflowStage, WorkflowStageResult, WorkflowTraceEvent } from "@synosec/contracts";
import {
  getWorkflowReportedAttackVectors,
  getWorkflowReportedFindings,
  workflowAttackVectorSubmissionSchema,
  workflowFindingSubmissionSchema,
  workflowReportAttackVectorsSubmissionSchema
} from "@synosec/contracts";
import { z } from "zod";
import { createScan, getScan } from "@/engine/scans/index.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { FixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";
import { getSemanticFamilyDefinition } from "@/modules/ai-tools/index.js";
import { ToolBroker } from "./broker/tool-broker.js";
import { executeSemanticFamilyTool } from "./semantic-family-tool-executor.js";
import {
  applyWorkflowRuntimeTarget,
  compactToolExecutionResult,
  enrichWorkflowFindingDetails,
  firstNonBlankString,
  inferLayer,
  normalizeToolInput,
  parseExecutionTarget,
  truncate,
  validateFindingEvidenceReferences,
  verifyFindingEvidence
} from "./workflow-execution.utils.js";
import { createWorkflowReportedAttackVector, createWorkflowReportedFinding } from "./workflow-finding-factory.js";
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

const DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS = 120_000;
const MODEL_STREAM_IDLE_TIMEOUT_ENV = "WORKFLOW_MODEL_STREAM_IDLE_TIMEOUT_MS";
export class DefaultWorkflowStageExecutor implements WorkflowStageRunner {
  private readonly broker: ToolBroker;
  private static readonly TARGET_CONTEXT_SUFFIX = [
    "Runtime target context:",
    "Target: {{target.name}}",
    "Operator URL: {{target.displayUrl}}",
    "Execution URL: {{target.url}}"
  ].join("\n");
  private static readonly SYSTEM_PROTOCOL_SUFFIX = [
    "Workflow execution contract:",
    "Run evidence tools first, use report_finding for supported weaknesses, use report_attack_vectors for cross-finding transitions, and call complete_run last.",
    "complete_run accepts only `summary`.",
    "complete_run closes the workflow run and does not create findings.",
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
      targetUrl: target.baseUrl,
      targetDisplayUrl: target.displayBaseUrl ?? target.baseUrl
    });
    const targetContextPrompt = this.renderPromptTemplate(DefaultWorkflowStageExecutor.TARGET_CONTEXT_SUFFIX, {
      workflowName: workflow.name,
      stageLabel: stage.label,
      stageObjective: stage.objective,
      targetName: targetRecord.name,
      targetUrl: target.baseUrl,
      targetDisplayUrl: target.displayBaseUrl ?? target.baseUrl
    });
    const systemPrompt = [
      renderedStageSystemPrompt,
      targetContextPrompt,
      DefaultWorkflowStageExecutor.SYSTEM_PROTOCOL_SUFFIX
    ].join("\n\n");
    const builtinLifecycleToolNames = new Set([
      "log_progress",
      "report_finding",
      "report_attack_vectors",
      "complete_run"
    ]);
    const exposedToolName = (tool: { id: string; executorType: string }) => {
      if (tool.executorType === "bash" && tool.id === "seed-agent-bash-command") {
        return "bash";
      }
      return tool.id;
    };
    const evidenceToolEntries = tools.flatMap((tool) => {
      if (tool.executorType === "bash" && tool.bashSource) {
        const exposedName = exposedToolName(tool);
        return [{
          exposedName,
          tool,
          description: tool.description ?? tool.name,
          execute: async (rawInput: unknown) => {
            const toolInput = applyWorkflowRuntimeTarget(normalizeToolInput(rawInput), target);
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
            const publicResult = compactToolExecutionResult({
              toolRunId: toolRun.id,
              toolId: tool.id,
              toolName: exposedName,
              status: toolRun.status,
              outputPreview: firstNonBlankString(
                brokerResult.observations[0]?.summary,
                toolRun.statusReason,
                toolRun.output,
                `${tool.name} ${toolRun.status}.`
              )!,
              observations: brokerResult.observations
            });

            const result: ExecutedToolResult = {
              toolId: tool.id,
              toolName: exposedName,
              toolInput,
              toolRequest: request,
              toolRun,
              status: toolRun.status,
              observations: brokerResult.observations,
              publicObservations: publicResult.observations,
              totalObservations: publicResult.totalObservations,
              truncated: publicResult.truncated,
              observationKeys: brokerResult.observations.map((observation) => observation.key),
              observationSummaries: brokerResult.observations.map((observation) => observation.summary),
              outputPreview: publicResult.outputPreview,
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
              toolName: exposedName,
              status: toolRun.status,
              outputPreview: result.outputPreview,
              observations: result.publicObservations,
              totalObservations: result.totalObservations,
              truncated: result.truncated
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
          { name: "report_finding", description: buildReportFindingDescription(stage) },
          { name: "report_attack_vectors", description: buildReportAttackVectorsDescription(stage) },
          { name: "complete_run", description: buildCompleteRunDescription(stage) }
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

    const scan = createWorkflowScan(currentRun, constraintSet, target);
    await this.ensureWorkflowScan(scan, targetRecord.id, agent.id);
    const executedResults: ExecutedToolResult[] = [];
    const reportedFindings = new Map(getWorkflowReportedFindings(currentRun).map((finding) => [finding.id, finding]));
    const reportedAttackVectors = new Map(getWorkflowReportedAttackVectors(currentRun).map((vector) => [vector.id, vector]));
    let terminalState: PipelineTerminalState | null = null;
    let liveModelOutput: WorkflowLiveModelOutput | null = null;
    const abortController = new AbortController();
    const liveOutputSource: WorkflowLiveModelOutput["source"] = "hosted";

    const hasTraceEvent = (traceEventId: string) => currentRun.events.some((event) => event.id === traceEventId);
    const hasToolRunRef = (toolRunRef: string) => executedResults.some((result) => result.toolRun.id === toolRunRef);
    const hasObservationRef = (observationRef: string) => executedResults.some((result) => result.observationKeys.includes(observationRef));
    const hasArtifactRef = (artifactRef: string) =>
      executedResults.some((result) => result.toolRun.id === artifactRef)
      || [...reportedFindings.values()].some((finding) => finding.evidence.some((entry) => entry.artifactRef === artifactRef))
      || [...reportedAttackVectors.values()].some((vector) => vector.transitionEvidence.some((entry) => entry.artifactRef === artifactRef));

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

    const appendAcceptedCompleteRunToolResult = async (toolCallId: string, rawStreamPartType: string) => {
      if (!terminalState || persistedToolResultIds.has(toolCallId)) {
        return;
      }

      const completionDetail = [
        `Agent summary: ${terminalState.summary}`
      ].join("\n");
      const output = { accepted: true };
      persistedToolResultIds.add(toolCallId);
      await appendEvent("tool_result", "completed", {
        toolCallId,
        toolName: "complete_run",
        toolId: null,
        output,
        summary: "complete_run accepted.",
        outputPreview: "complete_run accepted.",
        commandPreview: null,
        exitCode: null
      }, "complete_run returned", "complete_run accepted.", completionDetail, undefined, {
        rawStreamPartType
      });
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

    const submitAttackVector = async (
      rawInput: unknown,
      options?: {
        requireExistingFindingIdsOnly?: boolean;
      }
    ) => {
      const vectorInput = attachAttackVectorEvidenceReferences(
        parseWorkflowToolInput(workflowAttackVectorSubmissionSchema, rawInput, "Attack vector submission"),
        executedResults
      );
      const allowedFindingIds = options?.requireExistingFindingIdsOnly
        ? new Set(reportedFindings.keys())
        : null;
      if (allowedFindingIds && !allowedFindingIds.has(vectorInput.sourceFindingId)) {
        throw new RequestError(400, `Unknown source finding reference: ${vectorInput.sourceFindingId}`);
      }
      if (!reportedFindings.has(vectorInput.sourceFindingId)) {
        throw new RequestError(400, `Unknown source finding reference: ${vectorInput.sourceFindingId}`);
      }
      if (allowedFindingIds && !allowedFindingIds.has(vectorInput.destinationFindingId)) {
        throw new RequestError(400, `Unknown destination finding reference: ${vectorInput.destinationFindingId}`);
      }
      if (!reportedFindings.has(vectorInput.destinationFindingId)) {
        throw new RequestError(400, `Unknown destination finding reference: ${vectorInput.destinationFindingId}`);
      }
      const referenceError = validateAttackVectorEvidenceReferences(vectorInput, executedResults);
      if (referenceError) {
        throw new RequestError(400, referenceError);
      }
      for (const evidence of vectorInput.transitionEvidence) {
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

      const verification = verifyAttackVectorEvidence(vectorInput, reportedFindings, executedResults);
      if (verification.validationStatus === "rejected") {
        throw new RequestError(400, verification.reason);
      }
      const attackVector = createWorkflowReportedAttackVector({
        runId: currentRun.id,
        submission: {
          ...vectorInput,
          validationStatus: verification.validationStatus,
          confidence: verification.confidence
        }
      });
      reportedAttackVectors.set(attackVector.id, attackVector);
      await appendEvent("attack_vector_reported", "completed", {
        attackVector
      }, `Attack vector reported: ${attackVector.kind}`, `${attackVector.kind} from ${attackVector.sourceFindingId} to ${attackVector.destinationFindingId}.`, attackVector.summary);
      return attackVector;
    };
    const hydrateEvidenceRefs = <TEvidence extends Record<string, unknown>>(evidence: TEvidence[]) => evidence.map((item) => {
      const sourceTool = typeof item["sourceTool"] === "string" ? item["sourceTool"] : null;
      if (!sourceTool) {
        return item;
      }
      const toolRunRef = typeof item["toolRunRef"] === "string" ? item["toolRunRef"] : null;
      const observationRef = typeof item["observationRef"] === "string" ? item["observationRef"] : null;
      const artifactRef = typeof item["artifactRef"] === "string" ? item["artifactRef"] : null;
      const traceEventId = typeof item["traceEventId"] === "string" ? item["traceEventId"] : null;
      if (toolRunRef || observationRef || artifactRef || traceEventId) {
        return item;
      }
      const candidates = executedResults.filter((result) => result.toolName === sourceTool || result.toolId === sourceTool);
      if (candidates.length !== 1) {
        return item;
      }
      return {
        ...item,
        toolRunRef: candidates[0]!.toolRun.id
      };
    });

    const relaxedFindingEvidenceToolInputSchema = z.object({
      sourceTool: z.string().min(1),
      quote: z.string().min(1),
      artifactRef: z.string().min(1).optional(),
      observationRef: z.string().min(1).optional(),
      toolRunRef: z.string().min(1).optional(),
      traceEventId: z.string().uuid().optional(),
      externalUrl: z.string().url().optional()
    });
    const relaxedAttackVectorSubmissionToolInputSchema = z.object({
      kind: z.enum(["enables", "derived_from", "related", "lateral_movement"]),
      sourceFindingId: z.string().uuid(),
      destinationFindingId: z.string().uuid(),
      summary: z.string().min(1),
      preconditions: z.array(z.string().min(1)).optional(),
      impact: z.string().min(1),
      transitionEvidence: z.array(relaxedFindingEvidenceToolInputSchema).optional(),
      confidence: coerceNumericString(z.number().min(0).max(1)),
      validationStatus: z.enum(["unverified", "suspected", "single_source", "cross_validated", "reproduced", "blocked", "rejected"]).optional()
    });
    const reportFindingToolInputSchema = z.object({
      mode: z.literal("finding").optional(),
      type: z.enum(["service_exposure", "content_discovery", "missing_security_header", "tls_weakness", "injection_signal", "auth_weakness", "sensitive_data_exposure", "misconfiguration", "other"]).optional(),
      title: z.string().min(1).optional(),
      severity: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
      confidence: coerceNumericString(z.number().min(0).max(1)).optional(),
      target: z.object({
        host: z.string().min(1),
        port: coerceNumericString(z.number().int()).optional(),
        url: z.string().url().optional(),
        path: z.string().min(1).optional()
      }).optional(),
      evidence: z.array(relaxedFindingEvidenceToolInputSchema).optional(),
      impact: z.string().min(1).optional(),
      recommendation: z.string().min(1).optional(),
      validationStatus: z.enum(["unverified", "suspected", "single_source", "cross_validated", "reproduced", "blocked", "rejected"]).optional(),
      cwe: z.string().min(1).optional(),
      mitreId: z.string().min(1).optional(),
      owasp: z.string().min(1).optional(),
      reproduction: z.object({
        commandPreview: z.string().min(1).optional(),
        steps: z.array(z.string().min(1)).min(1)
      }).optional(),
      explanationSummary: z.string().min(1).optional(),
      confidenceReason: z.string().min(1).optional(),
      relationshipExplanations: z.object({
        derivedFrom: z.string().min(1).optional(),
        relatedTo: z.string().min(1).optional(),
        enables: z.string().min(1).optional(),
        chainRole: z.string().min(1).optional()
      }).optional(),
      tags: z.array(z.string().min(1)).optional(),
    }).passthrough();
    const reportAttackVectorsToolInputSchema = z.object({
      attackVectors: z.array(relaxedAttackVectorSubmissionToolInputSchema).min(1)
    }).strict();

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
        description: "Persist one finding-only workflow report. Provide `title` and at least one grounded `evidence` item, then let the server infer or default missing fields such as type, severity, confidence, target details, impact, recommendation, and reproduction details. Prefer canonical object inputs, but finding-compatible legacy inputs such as JSON-string payloads, numeric-string confidence, string `target`, and omitted `mode` values are still accepted. Returns the canonical finding result with `accepted`, `findingId`, `title`, `severity`, and `host`.",
        inputSchema: reportFindingToolInputSchema,
        execute: async (rawInput) => {
          const normalizedInput = normalizeWorkflowToolInput(rawInput, "Finding submission");
          rejectUnsupportedFindingFields(normalizedInput);
          const reportInput = parseWorkflowToolInput(reportFindingToolInputSchema, normalizedInput, "Finding submission");

          const parsedFindingInput = parseWorkflowToolInput(workflowFindingSubmissionSchema, {
            ...reportInput,
            mode: "finding",
            type: reportInput.type ?? "other",
            severity: reportInput.severity ?? "medium",
            confidence: reportInput.confidence ?? 0.8,
            target: {
              host: reportInput.target?.host?.trim() || target.host,
              ...(reportInput.target?.port === undefined ? {} : { port: reportInput.target.port }),
              ...(reportInput.target?.url ? { url: reportInput.target.url } : {}),
              ...(reportInput.target?.path ? { path: reportInput.target.path } : {})
            },
            evidence: hydrateEvidenceRefs(reportInput.evidence ?? []),
            impact: reportInput.impact ?? `Evidence indicates: ${reportInput.title}`,
            recommendation: reportInput.recommendation ?? "Review and remediate the reported issue based on the supporting evidence.",
            ...(reportInput.validationStatus ? { validationStatus: reportInput.validationStatus } : {}),
            derivedFromFindingIds: [],
            relatedFindingIds: [],
            enablesFindingIds: [],
            tags: reportInput.tags ?? []
          }, "Finding submission");
          const findingInput = parsedFindingInput;
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
            accepted: true,
            findingId: finding.id,
            title: finding.title,
            severity: finding.severity,
            host: finding.target.host
          };
        }
      }),
      report_attack_vectors: createSdkTool({
        description: "Persist one or more explicit attack-vector links between existing findings. Use this only after `report_finding` has returned the `findingId` values you want to connect. Provide `attackVectors` as an array; every non-`related` vector must include grounded `transitionEvidence`. Returns the canonical batch result with `accepted` and `attackVectorIds`.",
        inputSchema: reportAttackVectorsToolInputSchema,
        execute: async (rawInput) => {
          const reportInput = parseWorkflowToolInput(reportAttackVectorsToolInputSchema, rawInput, "Attack vector submission");
          const parsedVectors = parseWorkflowToolInput(workflowReportAttackVectorsSubmissionSchema, {
            attackVectors: reportInput.attackVectors.map((vector) => ({
              ...vector,
              preconditions: vector.preconditions ?? [],
              transitionEvidence: hydrateEvidenceRefs(vector.transitionEvidence ?? [])
            }))
          }, "Attack vector submission");
          const attackVectorIds: string[] = [];
          for (const vector of parsedVectors.attackVectors) {
            let attackVector: WorkflowReportedAttackVector;
            try {
              attackVector = await submitAttackVector(vector, {
                requireExistingFindingIdsOnly: true
              });
            } catch (error) {
              if (error instanceof RequestError) {
                const message = error.message.startsWith("Attack vector submission validation failed:")
                  ? error.message
                  : `Attack vector submission validation failed: ${error.message}`;
                throw workflowToolValidationError("report_attack_vectors", message, { cause: error });
              }
              throw error;
            }
            attackVectorIds.push(attackVector.id);
          }
          return {
            accepted: true,
            attackVectorIds
          };
        }
      }),
      complete_run: createSdkTool({
        description: buildCompleteRunDescription(stage),
        inputSchema: z.object({
          summary: z.string().min(1)
        }).strict(),
        execute: async (rawInput) => {
          const completion = z.object({
            summary: z.string().min(1)
          }).strict().parse(rawInput);
          const completionDetail = [
            `Agent summary: ${completion.summary}`
          ].join("\n");
          await appendEvent("verification", "completed", {
            messageKind: "accept",
            action: "complete_run",
            summary: "The agent finished the workflow run.",
            detail: completionDetail
          }, "Run completion accepted", "The agent finished the workflow run.", completionDetail);
          terminalState = {
            status: "completed",
            summary: completion.summary
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
      const streamIterator = result.fullStream[Symbol.asyncIterator]();
      const modelStreamIdleTimeoutMs = getModelStreamIdleTimeoutMs();
      while (true) {
        const nextPart = await readNextModelStreamPart(streamIterator, modelStreamIdleTimeoutMs, abortController);
        if (nextPart.done) {
          break;
        }
        const rawPart = nextPart.value;
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
                const resultSummary = firstNonBlankString(rawContent, `${toolCall.toolName} returned no output.`)!;
                await appendEvent("tool_result", item.is_error ? "failed" : "completed", {
                  toolCallId: item.tool_use_id,
                  toolName: toolCall.toolName,
                  toolId: toolCall.toolId,
                  output: item.content,
                  summary: resultSummary,
                  outputPreview: resultSummary,
                  commandPreview: null,
                  exitCode: null
                }, `${toolCall.toolName} returned`, resultSummary, firstNonBlankString(rawContent), undefined, {
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
            if (part.toolName === "complete_run") {
              await appendAcceptedCompleteRunToolResult(part.toolCallId, part.type);
            }
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
            const partIsError = typeof part.isError === "boolean" && part.isError;
            const completeRunRejected = part.toolName === "complete_run"
              && typeof part.output === "object"
              && part.output !== null
              && "accepted" in part.output
              && part.output.accepted === false;
            const resultStatus = partIsError
              || matchingResult?.status === "failed"
              || matchingResult?.status === "denied"
              || completeRunRejected
              ? "failed"
              : "completed";
            const outputPreview = matchingResult?.outputPreview
              ? firstNonBlankString(matchingResult.outputPreview, findingResult?.summary, `${part.toolName} completed.`)!
              : firstNonBlankString(findingResult?.summary, `${part.toolName} completed.`)!;
            const publicOutput = matchingResult
              ? {
                  toolRunId: matchingResult.toolRun.id,
                  toolId: matchingResult.toolId,
                  toolName: matchingResult.toolName,
                  status: matchingResult.status,
                  outputPreview: matchingResult.outputPreview,
                  observations: matchingResult.publicObservations,
                  totalObservations: matchingResult.totalObservations,
                  truncated: matchingResult.truncated
                }
              : part.output;
            persistedToolResultIds.add(part.toolCallId);
            await appendEvent("tool_result", resultStatus, {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: matchingResult?.toolId ?? null,
              output: publicOutput,
              summary: outputPreview,
              outputPreview,
              commandPreview: matchingResult?.commandPreview ?? null,
              exitCode: matchingResult?.exitCode ?? null
            }, `${part.toolName} returned`, outputPreview, JSON.stringify(publicOutput, null, 2), undefined, {
              rawStreamPartType: part.type
            });
            break;
          }
          case "tool-error": {
            const matchingResult = executedResults.find((candidate) => candidate.toolName === part.toolName);
            const rawError = part.error instanceof Error
              ? firstNonBlankString(part.error.message, part.error.stack, "Tool execution failed.")!
              : firstNonBlankString(typeof part.error === "string" ? part.error : JSON.stringify(part.error, null, 2), "Tool execution failed.")!;
            persistedToolResultIds.add(part.toolCallId);
            await appendEvent("tool_result", "failed", {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              toolId: matchingResult?.toolId ?? null,
              output: {
                toolRunId: matchingResult?.toolRun.id ?? `${part.toolCallId}-failed`,
                toolId: matchingResult?.toolId ?? part.toolName,
                toolName: matchingResult?.toolName ?? part.toolName,
                status: "failed",
                outputPreview: rawError,
                observations: [],
                totalObservations: matchingResult?.totalObservations ?? 0,
                truncated: false
              },
              summary: rawError,
              outputPreview: rawError,
              commandPreview: matchingResult?.commandPreview ?? null,
              exitCode: matchingResult?.exitCode ?? null
            }, `${part.toolName} failed`, rawError, JSON.stringify({
              toolRunId: matchingResult?.toolRun.id ?? `${part.toolCallId}-failed`,
              toolId: matchingResult?.toolId ?? part.toolName,
              toolName: matchingResult?.toolName ?? part.toolName,
              status: "failed",
              outputPreview: rawError,
              observations: [],
              totalObservations: matchingResult?.totalObservations ?? 0,
              truncated: false
            }, null, 2), undefined, {
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
      await streamIterator.return?.();
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        await appendEvent("verification", "failed", {
          message: error instanceof Error ? error.message : String(error)
        }, "Workflow model execution failed", error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack ?? error.message : String(error));
        throw error;
      }
    }

    if (!terminalState) {
      const recoveryPrompt = [
        "The previous model stream ended without calling complete_run.",
        "Do not call additional evidence tools.",
        "",
        "Required next action:",
        "- Call complete_run once as the final action.",
        "- Provide only `summary`.",
        "",
        "Tool results:",
        ...(executedResults.length > 0
          ? executedResults.map((result, index) => [
              `${index + 1}. ${result.toolName} status=${result.status} toolRunId=${result.toolRun.id}`,
              `   output=${firstNonBlankString(result.outputPreview, result.fullOutput, result.toolRun.statusReason, "no output")}`,
              result.status === "failed" || result.status === "denied"
                ? `   failedToolRunId=${result.toolRun.id}`
                : null
            ].filter(Boolean).join("\n"))
          : ["No evidence tools were executed."]),
      ].join("\n");

      await appendEvent("verification", "failed", {
        messageKind: "challenge",
        action: "complete_run_recovery",
        message: "The model stream ended before complete_run; requesting one final completion call."
      }, "Run completion recovery requested", "The model ended without complete_run; requesting one final completion call.", recoveryPrompt);

      const recoveryResult = streamText({
        model: this.createLanguageModel(runtime),
        system: systemPrompt,
        prompt: recoveryPrompt,
        tools: {
          complete_run: systemTools.complete_run
        },
        stopWhen: stepCountIs(2),
        abortSignal: abortController.signal
      });

      try {
        const recoveryIterator = recoveryResult.fullStream[Symbol.asyncIterator]();
        const modelStreamIdleTimeoutMs = getModelStreamIdleTimeoutMs();
        while (true) {
          const nextPart = await readNextModelStreamPart(recoveryIterator, modelStreamIdleTimeoutMs, abortController);
          if (nextPart.done) {
            break;
          }

          const part = nextPart.value as any;
          switch (part.type) {
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
            case "tool-call": {
              toolCallsById.set(part.toolCallId, {
                toolName: part.toolName,
                toolId: null
              });
              await appendEvent("tool_call", "running", {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                toolId: null,
                input: JSON.stringify(part.input, null, 2)
              }, `Calling ${part.toolName}`, `Invoked ${part.toolName}.`, JSON.stringify(part.input, null, 2), undefined, {
                rawStreamPartType: part.type
              });
              if (part.toolName === "complete_run") {
                await appendAcceptedCompleteRunToolResult(part.toolCallId, part.type);
              }
              break;
            }
            case "tool-result": {
              const rawOutput = typeof part.output === "string"
                ? part.output
                : JSON.stringify(part.output, null, 2);
              const outputPreview = firstNonBlankString(rawOutput, `${part.toolName} completed.`)!;
              const publicOutput = {
                toolRunId: part.toolCallId,
                toolId: part.toolName,
                toolName: part.toolName,
                status: "completed" as const,
                outputPreview,
                observations: [],
                totalObservations: 0,
                truncated: false
              };
              persistedToolResultIds.add(part.toolCallId);
              await appendEvent("tool_result", "completed", {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                toolId: null,
                output: publicOutput,
                summary: outputPreview,
                outputPreview,
                commandPreview: null,
                exitCode: null
              }, `${part.toolName} returned`, outputPreview, JSON.stringify(publicOutput, null, 2), undefined, {
                rawStreamPartType: part.type
              });
              break;
            }
            case "tool-error": {
              const rawError = part.error instanceof Error
                ? firstNonBlankString(part.error.message, part.error.stack, "Tool execution failed.")!
                : firstNonBlankString(typeof part.error === "string" ? part.error : JSON.stringify(part.error, null, 2), "Tool execution failed.")!;
              persistedToolResultIds.add(part.toolCallId);
              await appendEvent("tool_result", "failed", {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                toolId: null,
                output: {
                  toolRunId: `${part.toolCallId}-failed`,
                  toolId: part.toolName,
                  toolName: part.toolName,
                  status: "failed",
                  outputPreview: rawError,
                  observations: [],
                  totalObservations: 0,
                  truncated: false
                },
                summary: rawError,
                outputPreview: rawError,
                commandPreview: null,
                exitCode: null
              }, `${part.toolName} failed`, rawError, JSON.stringify({
                toolRunId: `${part.toolCallId}-failed`,
                toolId: part.toolName,
                toolName: part.toolName,
                status: "failed",
                outputPreview: rawError,
                observations: [],
                totalObservations: 0,
                truncated: false
              }, null, 2), undefined, {
                rawStreamPartType: part.type
              });
              break;
            }
            case "finish": {
              const finalLiveModelOutput = finalizeLiveModelOutput();
              await appendEvent("system_message", part.finishReason === "error" ? "failed" : "completed", {
                finishReason: part.finishReason,
                rawFinishReason: part.rawFinishReason,
                totalUsage: part.totalUsage
              }, "Model recovery stream finished", `Recovery stream finished with reason: ${part.finishReason}.`, null, undefined, {
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
              }, "Model recovery stream error", part.error instanceof Error ? part.error.message : String(part.error), part.error instanceof Error ? part.error.stack ?? part.error.message : String(part.error), undefined, {
                rawStreamPartType: part.type,
                liveModelOutput: finalLiveModelOutput
              });
              break;
            }
            default:
              break;
          }
        }
        await recoveryIterator.return?.();
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          await appendEvent("verification", "failed", {
            message: error instanceof Error ? error.message : String(error)
          }, "Workflow completion recovery failed", error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack ?? error.message : String(error));
          throw error;
        }
      }
    }

    if (!terminalState) {
      throw new RequestError(500, "The model finished without calling complete_run.");
    }

    const finalTerminalState = terminalState as PipelineTerminalState;
    const stageResult: WorkflowStageResult = {
      status: finalTerminalState.status,
      summary: finalTerminalState.summary,
      findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
      submittedAt: new Date().toISOString()
    };

    currentRun = await appendEvent(
      "stage_result_submitted",
      "completed",
      { stageResult },
      `Stage result submitted: ${stage.label}`,
      stageResult.summary
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
      targetDisplayUrl?: string;
    }
  ) {
    const supportedTokens = new Map<string, string>([
      ["workflow.name", values.workflowName],
      ["stage.label", values.stageLabel],
      ["stage.objective", values.stageObjective],
      ["target.name", values.targetName],
      ["target.url", values.targetUrl],
      ["target.displayUrl", values.targetDisplayUrl ?? values.targetUrl]
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

function getModelStreamIdleTimeoutMs() {
  const rawTimeout = process.env[MODEL_STREAM_IDLE_TIMEOUT_ENV];
  if (!rawTimeout) {
    return DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS;
  }

  const parsedTimeout = Number(rawTimeout);
  return Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? parsedTimeout
    : DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS;
}

async function readNextModelStreamPart<T>(
  streamIterator: AsyncIterator<T>,
  idleTimeoutMs: number,
  abortController: AbortController
): Promise<IteratorResult<T>> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const seconds = Math.round(idleTimeoutMs / 1000);
      const message = `Workflow model stream produced no events for ${seconds} second${seconds === 1 ? "" : "s"}.`;
      reject(new RequestError(504, message, {
        code: "WORKFLOW_MODEL_STREAM_IDLE_TIMEOUT",
        userFriendlyMessage: "The model stream stalled and the workflow was failed instead of left running."
      }));
      abortController.abort("workflow-model-idle-timeout");
    }, idleTimeoutMs);
  });

  try {
    return await Promise.race([streamIterator.next(), timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function rejectUnsupportedFindingFields(rawInput: unknown) {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return;
  }

  const unsupportedFields = [
    "derivedFromFindingIds",
    "relatedFindingIds",
    "enablesFindingIds",
    "chain",
    "attackVectors",
    "kind",
    "sourceFindingId",
    "destinationFindingId",
    "summary",
    "preconditions",
    "transitionEvidence"
  ].filter((field) => field in (rawInput as Record<string, unknown>));
  if (unsupportedFields.length > 0) {
    throw workflowToolValidationError("report_finding", `Finding submission validation failed: unsupported fields for report_finding: ${unsupportedFields.join(", ")}.`);
  }
}

function attackVectorAsEvidenceCarrier(input: WorkflowAttackVectorSubmission, findings: Map<string, WorkflowReportedFinding>) {
  const sourceFinding = findings.get(input.sourceFindingId);
  return {
    type: sourceFinding?.type ?? "other",
    title: input.summary,
    severity: sourceFinding?.severity ?? "medium",
    confidence: input.confidence,
    target: sourceFinding?.target ?? { host: "unknown" },
    evidence: input.transitionEvidence,
    impact: input.impact,
    recommendation: "Validate and remediate the linked findings that enable this transition.",
    validationStatus: input.validationStatus,
    derivedFromFindingIds: [],
    relatedFindingIds: [],
    enablesFindingIds: [],
    tags: []
  } satisfies z.infer<typeof workflowFindingSubmissionSchema>;
}

function attachAttackVectorEvidenceReferences(
  vector: WorkflowAttackVectorSubmission,
  executedResults: ExecutedToolResult[]
): WorkflowAttackVectorSubmission {
  return {
    ...vector,
    transitionEvidence: vector.transitionEvidence.map((item) => {
      if (item.toolRunRef || item.observationRef || item.artifactRef || item.traceEventId) {
        return item;
      }
      const candidates = executedResults.filter((result) => result.toolName === item.sourceTool || result.toolId === item.sourceTool);
      if (candidates.length !== 1) {
        return item;
      }
      return {
        ...item,
        toolRunRef: candidates[0]!.toolRun.id
      };
    })
  };
}

function validateAttackVectorEvidenceReferences(
  vector: WorkflowAttackVectorSubmission,
  executedResults: ExecutedToolResult[]
) {
  if (vector.transitionEvidence.length === 0) {
    return null;
  }
  return validateFindingEvidenceReferences({
    type: "other",
    title: vector.summary,
    severity: "medium",
    confidence: vector.confidence,
    target: { host: "transition" },
    evidence: vector.transitionEvidence,
    impact: vector.impact,
    recommendation: "Validate the transition.",
    validationStatus: vector.validationStatus,
    derivedFromFindingIds: [],
    relatedFindingIds: [],
    enablesFindingIds: [],
    tags: []
  }, executedResults);
}

function verifyAttackVectorEvidence(
  vector: WorkflowAttackVectorSubmission,
  findings: Map<string, WorkflowReportedFinding>,
  executedResults: ExecutedToolResult[]
): { validationStatus: WorkflowAttackVectorSubmission["validationStatus"]; confidence: number; reason: string } {
  if (vector.transitionEvidence.length === 0) {
    return {
      validationStatus: vector.kind === "related" ? "suspected" : "rejected",
      confidence: vector.kind === "related" ? Math.min(vector.confidence, 0.65) : 0.1,
      reason: vector.kind === "related"
        ? "Related attack vector was reported without transition evidence."
        : "Transition evidence is required for this attack vector kind."
    };
  }

  const verification = verifyFindingEvidence(attackVectorAsEvidenceCarrier(vector, findings), executedResults);
  return {
    validationStatus: verification.validationStatus,
    confidence: verification.confidence,
    reason: verification.reason
  };
}

function formatZodIssues(error: z.ZodError, rootPathLabel = "input") {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : rootPathLabel;
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function workflowToolValidationError(
  toolName: "report_finding" | "report_attack_vectors",
  message: string,
  options?: { cause?: unknown }
) {
  const actionLabel = toolName === "report_finding" ? "Finding submission" : "Attack vector submission";
  return new RequestError(400, message, {
    cause: options?.cause,
    code: toolName === "report_finding" ? "WORKFLOW_REPORT_FINDING_INVALID" : "WORKFLOW_REPORT_ATTACK_VECTORS_INVALID",
    userFriendlyMessage: `${actionLabel} was rejected. Check the reported fields and evidence references, then try again.`
  });
}

function parseWorkflowToolInput<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  rawInput: unknown,
  label: string
): z.output<TSchema> {
  const normalizedInput = normalizeWorkflowToolInput(rawInput, label);
  try {
    return schema.parse(normalizedInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const rootPathLabel = label.toLowerCase();
      throw workflowToolValidationError(
        label === "Finding submission" ? "report_finding" : "report_attack_vectors",
        `${label} validation failed: ${formatZodIssues(error, rootPathLabel)}`,
        { cause: error }
      );
    }
    throw error;
  }
}

function coerceNumericString(schema: z.ZodNumber) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return value;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }, schema);
}

function normalizeWorkflowToolInput(rawInput: unknown, label: string): unknown {
  const parsedInput = (() => {
    if (typeof rawInput !== "string") {
      return rawInput;
    }

    const trimmed = rawInput.trim();
    if (!trimmed) {
      return rawInput;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown JSON parsing error.";
      throw workflowToolValidationError(
        label === "Finding submission" ? "report_finding" : "report_attack_vectors",
        `${label} parsing failed: ${reason}`,
        { cause: error }
      );
    }
  })();

  return coerceWorkflowToolInput(parsedInput, label);
}

function coerceWorkflowToolInput(rawInput: unknown, label: string): unknown {
  if (label !== "Finding submission" && label !== "Attack vector submission") {
    return rawInput;
  }

  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return rawInput;
  }

  const normalized = { ...(rawInput as Record<string, unknown>) };

  if (typeof normalized["confidence"] === "string") {
    const parsedConfidence = Number(normalized["confidence"]);
    if (Number.isFinite(parsedConfidence)) {
      normalized["confidence"] = parsedConfidence;
    }
  }

  const parseEvidenceArrayString = (value: unknown) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
      return value;
    }
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value;
    }
  };

  if (label !== "Finding submission") {
    if (Array.isArray(normalized["attackVectors"])) {
      normalized["attackVectors"] = normalized["attackVectors"].map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return entry;
        }
        const vector = { ...(entry as Record<string, unknown>) };
        vector["transitionEvidence"] = parseEvidenceArrayString(vector["transitionEvidence"]);
        return vector;
      });
    }
    return normalized;
  }

  if (typeof normalized["target"] === "string") {
    const host = normalized["target"].trim();
    if (host.length > 0) {
      normalized["target"] = { host };
    }
  }

  normalized["evidence"] = parseEvidenceArrayString(normalized["evidence"]);

  const mode = normalized["mode"];
  if (mode === undefined && normalized["type"] !== undefined) {
    normalized["mode"] = "finding";
  }

  return normalized;
}

function buildReportFindingDescription(stage: WorkflowStage) {
  const lines = [
    "Persist one finding-only workflow report.",
    "Provide a title and at least one evidence item with a persisted reference. Other finding fields are optional and can be inferred or defaulted.",
    "Prefer canonical object inputs, but finding-compatible legacy inputs are still accepted, including JSON-string payloads, numeric-string confidence, string target, and omitted finding mode.",
    "Do not attach relationship fields, chain metadata, or attack vectors to findings. Submit those separately with report_attack_vectors after you have the returned finding ids."
  ];

  if (stage.completionRule.requireChainedFindings) {
    lines.push("This stage requires chained findings, so report explicit attack vectors between findings or provide attack paths through the handoff.");
  }

  if (stage.handoffSchema) {
    lines.push("If you intend to complete with handoff, keep finding ids consistent with the final handoff references.");
  }

  return lines.join(" ");
}

function buildReportAttackVectorsDescription(stage: WorkflowStage) {
  const lines = [
    "Persist one or more explicit attack-vector links between existing findings.",
    "Use this only after report_finding has returned the finding ids you want to connect.",
    "Provide attackVectors as an array. Every non-related vector must include transitionEvidence with persisted references."
  ];

  if (stage.completionRule.requireChainedFindings) {
    lines.push("This stage requires chained findings, so use this action to make cross-finding transitions explicit.");
  }

  if (stage.handoffSchema) {
    lines.push("Keep finding ids aligned with any final handoff attackVectors or attackPaths.");
  }

  return lines.join(" ");
}

function buildCompleteRunDescription(_stage: WorkflowStage) {
  return "Finish the workflow run last. Provide only `summary`. This action closes the workflow run and does not create findings.";
}
