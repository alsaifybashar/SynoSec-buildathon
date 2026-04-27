import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import type { OsiLayer, Scan, Workflow, WorkflowAttackVectorSubmission, WorkflowLiveModelOutput, WorkflowReportedAttackVector, WorkflowReportedFinding, WorkflowRun, WorkflowStage, WorkflowStageCompletionRule, WorkflowStageResult, WorkflowTraceEvent } from "@synosec/contracts";
import {
  getWorkflowReportedAttackVectors,
  getWorkflowReportedFindings,
  parseAttackPathHandoff,
  validateAttackPathHandoffReferences,
  workflowAttackVectorSubmissionSchema,
  workflowBlockedCompletionSchema,
  workflowFindingSubmissionSchema,
  workflowReportFindingSubmissionSchema
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
const ATTACK_PATH_HANDOFF_HINT = "When handoff is required, use this shape exactly: handoff.attackVenues[] with {id,label,venueType,targetLabel,summary,findingIds}; handoff.attackVectors[] with {id,label,sourceVenueId,preconditions,impact,confidence,findingIds}; handoff.attackPaths[] with {id,title,summary,severity,venueIds,vectorIds,findingIds}.";

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
    "Run evidence tools first, use report_finding for supported weaknesses, and call complete_run last.",
    "Before complete_run, compare your progress against the active stage gate below.",
    "complete_run does not create findings and cannot compensate for missing findings, missing evidence, or missing handoff data.",
    "If complete_run is rejected, use the rejection reason to choose the next valid action.",
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
    const completionRulePrompt = describeCompletionRuleForPrompt(stage);
    const systemPrompt = [
      renderedStageSystemPrompt,
      targetContextPrompt,
      completionRulePrompt,
      DefaultWorkflowStageExecutor.SYSTEM_PROTOCOL_SUFFIX
    ].join("\n\n");
    const builtinLifecycleToolNames = new Set([
      "log_progress",
      "report_finding",
      "report_attack_vector",
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
            const outputPreview = truncate(firstNonBlankString(
              brokerResult.observations[0]?.summary,
              toolRun.statusReason,
              toolRun.output,
              `${tool.name} ${toolRun.status}.`
            )!);

            const result: ExecutedToolResult = {
              toolId: tool.id,
              toolName: exposedName,
              toolInput,
              toolRequest: request,
              toolRun,
              status: toolRun.status,
              observations: brokerResult.observations,
              observationKeys: brokerResult.observations.map((observation) => observation.key),
              observationSummaries: brokerResult.observations.map((observation) => observation.summary),
              outputPreview,
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
          { name: "report_finding", description: buildReportFindingDescription(stage) },
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
        `Agent summary: ${terminalState.summary}`,
        `Recommended next step: ${terminalState.recommendedNextStep}`,
        `Residual risk: ${terminalState.residualRisk}`,
        ...(terminalState.blocked ? [
          `Blocked reason: ${terminalState.blocked.reason}`,
          `Operator summary: ${terminalState.blocked.operatorSummary}`,
          `Recommended fix: ${terminalState.blocked.recommendedFix}`
        ] : [])
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
        fullOutput: JSON.stringify(output, null, 2),
        commandPreview: null,
        exitCode: null,
        observations: [],
        observationRecords: [],
        usedToolId: null,
        usedToolName: null,
        fallbackUsed: false,
        attempts: []
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
      mode: z.enum(["finding", "attack_vector"]).optional(),
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
      derivedFromFindingIds: z.array(z.string().uuid()).optional(),
      relatedFindingIds: z.array(z.string().uuid()).optional(),
      enablesFindingIds: z.array(z.string().uuid()).optional(),
      chain: z.object({
        id: z.string().min(1).optional(),
        title: z.string().min(1),
        summary: z.string().min(1),
        severity: z.enum(["info", "low", "medium", "high", "critical"]).optional()
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
      attackVectors: z.array(relaxedAttackVectorSubmissionToolInputSchema).optional(),
      kind: z.enum(["enables", "derived_from", "related", "lateral_movement"]).optional(),
      sourceFindingId: z.string().uuid().optional(),
      destinationFindingId: z.string().uuid().optional(),
      summary: z.string().min(1).optional(),
      preconditions: z.array(z.string().min(1)).optional(),
      transitionEvidence: z.array(relaxedFindingEvidenceToolInputSchema).optional()
    }).passthrough();

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
        description: "Persist findings and attack-vector links through one mode-based action. Use `mode: \"finding\"` for evidence-backed findings (optionally with `attackVectors` between existing finding ids) and `mode: \"attack_vector\"` to submit one or more vectors between existing findings only. In finding mode, `type` must be one of: service_exposure, content_discovery, missing_security_header, tls_weakness, injection_signal, auth_weakness, sensitive_data_exposure, misconfiguration, other. `confidence` must be a number from 0 to 1 and `target` must be an object with at least `host`.",
        inputSchema: reportFindingToolInputSchema,
        execute: async (rawInput) => {
          const normalizedInput = normalizeWorkflowToolInput(rawInput, "Finding submission");
          const mode = typeof normalizedInput === "object" && normalizedInput !== null
            ? (normalizedInput as Record<string, unknown>)["mode"]
            : undefined;
          const reportInput = parseWorkflowToolInput(reportFindingToolInputSchema, normalizedInput, mode === "attack_vector" ? "Attack vector submission" : "Finding submission");

          if (reportInput.mode === "attack_vector") {
            const rawVectors = reportInput.attackVectors ?? [];
            const parsedVectors = rawVectors.map((vector) =>
              parseWorkflowToolInput(workflowAttackVectorSubmissionSchema, {
                ...vector,
                preconditions: vector.preconditions ?? [],
                transitionEvidence: hydrateEvidenceRefs(vector.transitionEvidence ?? [])
              }, "Attack vector submission")
            );
            const attackVectorIds: string[] = [];
            for (const vector of parsedVectors) {
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
                  throw new RequestError(error.status, message, {
                    cause: error
                  });
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

          const parsedFindingInput = parseWorkflowToolInput(workflowFindingSubmissionSchema, {
            ...reportInput,
            mode: "finding",
            evidence: hydrateEvidenceRefs(reportInput.evidence ?? []),
            derivedFromFindingIds: reportInput.derivedFromFindingIds ?? [],
            relatedFindingIds: reportInput.relatedFindingIds ?? [],
            enablesFindingIds: reportInput.enablesFindingIds ?? [],
            tags: reportInput.tags ?? []
          }, "Finding submission");
          const findingInput = parsedFindingInput;
          const nestedAttackVectors = reportInput.attackVectors ?? [];
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

          const existingFindingIds = new Set(reportedFindings.keys());
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

          const attackVectorIds: string[] = [];
          for (const vector of nestedAttackVectors) {
            if (!existingFindingIds.has(vector.sourceFindingId) || !existingFindingIds.has(vector.destinationFindingId)) {
              throw new RequestError(400, "Attack vector submission validation failed: attackVectors must reference existing finding ids only.");
            }
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
                throw new RequestError(error.status, message, {
                  cause: error
                });
              }
              throw error;
            }
            attackVectorIds.push(attackVector.id);
          }

          return {
            findingId: finding.id,
            title: finding.title,
            severity: finding.severity,
            host: finding.target.host,
            attackVectorIds
          };
        }
      }),
      report_attack_vector: createSdkTool({
        description: "Deprecated compatibility action for older workflow runs. Prefer report_finding with `mode: \"attack_vector\"` for new submissions. Non-related vectors require transitionEvidence grounded in persisted tool results.",
        inputSchema: relaxedAttackVectorSubmissionToolInputSchema,
        execute: async (rawInput) => {
          const attackVector = await submitAttackVector(rawInput);
          return {
            attackVectorId: attackVector.id,
            kind: attackVector.kind,
            sourceFindingId: attackVector.sourceFindingId,
            destinationFindingId: attackVector.destinationFindingId
          };
        }
      }),
      complete_run: createSdkTool({
        description: buildCompleteRunDescription(stage),
        inputSchema: z.object({
          summary: z.string().min(1),
          recommendedNextStep: z.string().min(1),
          residualRisk: z.string().min(1),
          blocked: workflowBlockedCompletionSchema.optional(),
          handoff: z.record(z.string(), z.unknown()).nullable().optional()
        }),
        execute: async (rawInput) => {
          const completion = z.object({
            summary: z.string().min(1),
            recommendedNextStep: z.string().min(1),
            residualRisk: z.string().min(1),
            blocked: workflowBlockedCompletionSchema.optional(),
            handoff: z.record(z.string(), z.unknown()).nullable().optional()
          }).parse(rawInput);
          const reportedFindingList = [...reportedFindings.values()];
          const reportedAttackVectorList = [...reportedAttackVectors.values()];
          const rejectedCompletion = async (message: string, detail?: string, payload: Record<string, unknown> = {}) => {
            await appendEvent("verification", "failed", {
              messageKind: "challenge",
              action: "complete_run",
              message,
              ...payload
            }, "Run completion rejected", message, detail ?? message);
            throw new RequestError(400, message);
          };
          const blockedCompletion = (() => {
            if (!completion.blocked) {
              return null;
            }

            const failedToolRunIds = new Set(executedResults
              .filter((result) => result.status === "failed" || result.status === "denied")
              .map((result) => result.toolRun.id));
            const invalidRefs = completion.blocked.failedToolRunIds.filter((toolRunId) => !failedToolRunIds.has(toolRunId));
            if (invalidRefs.length > 0) {
              return new RequestError(400, `Blocked completion references unknown or non-failed tool runs: ${invalidRefs.join(", ")}.`);
            }

            return completion.blocked;
          })();
          if (blockedCompletion instanceof RequestError) {
            return rejectedCompletion(blockedCompletion.message);
          }
          const completionHandoff = (() => {
            if (blockedCompletion) {
              return null;
            }
            try {
              return validateCompletionHandoff({
                stage,
                rawHandoff: completion.handoff ?? null,
                findings: reportedFindingList,
                attackVectors: reportedAttackVectorList
              });
            } catch (error) {
              if (error instanceof RequestError) {
                return error;
              }
              throw error;
            }
          })();
          if (completionHandoff instanceof RequestError) {
            return rejectedCompletion(completionHandoff.message, stage.handoffSchema ? `${completionHandoff.message}\n${ATTACK_PATH_HANDOFF_HINT}` : undefined);
          }
          if (!blockedCompletion) {
            const completionAssertions = evaluateCompletionAssertions({
              completionRule: stage.completionRule,
              executedResults,
              findings: reportedFindingList,
              attackVectors: reportedAttackVectorList,
              handoff: stage.handoffSchema ? completionHandoff : null
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
          }
          const completionDetail = [
            `Agent summary: ${completion.summary}`,
            `Recommended next step: ${completion.recommendedNextStep}`,
            `Residual risk: ${completion.residualRisk}`,
            ...(blockedCompletion ? [
              `Blocked reason: ${blockedCompletion.reason}`,
              `Operator summary: ${blockedCompletion.operatorSummary}`,
              `Recommended fix: ${blockedCompletion.recommendedFix}`
            ] : [])
          ].join("\n");
          await appendEvent("verification", "completed", {
            messageKind: "accept",
            action: "complete_run",
            summary: blockedCompletion ? "The agent recorded a blocked workflow outcome." : "The agent finished pen testing.",
            detail: completionDetail,
            ...(blockedCompletion ? { blocked: blockedCompletion } : {})
          }, "Run completion accepted", blockedCompletion ? "The agent recorded a blocked workflow outcome." : "The agent finished pen testing.", completionDetail);
          terminalState = {
            status: blockedCompletion ? "blocked" : "completed",
            summary: completion.summary,
            recommendedNextStep: completion.recommendedNextStep,
            residualRisk: completion.residualRisk,
            handoff: completionHandoff,
            ...(blockedCompletion ? { blocked: blockedCompletion } : {})
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
                  fullOutput: rawContent ?? "",
                  commandPreview: null,
                  exitCode: null,
                  observations: [],
                  observationRecords: [],
                  usedToolId: null,
                  usedToolName: null,
                  fallbackUsed: false,
                  attempts: []
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
            const fullOutput = firstNonBlankString(matchingResult?.fullOutput, findingResult?.detail);
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
                error: rawError
              },
              summary: rawError,
              outputPreview: rawError,
              fullOutput: rawError,
              commandPreview: matchingResult?.commandPreview ?? null,
              exitCode: matchingResult?.exitCode ?? null,
              observations: matchingResult?.observationSummaries ?? [],
              observationRecords: matchingResult?.observations ?? [],
              usedToolId: matchingResult?.usedToolId ?? null,
              usedToolName: matchingResult?.usedToolName ?? null,
              fallbackUsed: matchingResult?.fallbackUsed ?? false,
              attempts: matchingResult?.attempts ?? []
            }, `${part.toolName} failed`, rawError, rawError, undefined, {
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
      const failedToolRunIds = executedResults
        .filter((result) => result.status === "failed" || result.status === "denied")
        .map((result) => result.toolRun.id);
      const recoveryPrompt = [
        "The previous model stream ended without calling complete_run.",
        "Do not call additional evidence tools.",
        "",
        describeCompletionRuleForPrompt(stage),
        "",
        "Recovery state:",
        `- reported_findings: ${reportedFindings.size}`,
        `- reported_attack_vectors: ${reportedAttackVectors.size}`,
        `- failed_tool_runs: ${failedToolRunIds.length > 0 ? failedToolRunIds.join(", ") : "none"}`,
        "",
        "Required next action:",
        "- If the stage gate is already satisfied, call complete_run once as the final action.",
        "- If evidence already supports a required weakness but no finding was submitted successfully, call report_finding instead of complete_run blocked.",
        "- Use blocked completion only when actual failed or denied tool runs prevented validation, and include those toolRunId values.",
        "- Do not invent findings, attack paths, or failed tool references.",
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
              persistedToolResultIds.add(part.toolCallId);
              await appendEvent("tool_result", "completed", {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                toolId: null,
                output: part.output,
                summary: outputPreview,
                outputPreview,
                fullOutput: rawOutput ?? "",
                commandPreview: null,
                exitCode: null,
                observations: [],
                observationRecords: [],
                usedToolId: null,
                usedToolName: null,
                fallbackUsed: false,
                attempts: []
              }, `${part.toolName} returned`, outputPreview, firstNonBlankString(rawOutput), undefined, {
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
                  error: rawError
                },
                summary: rawError,
                outputPreview: rawError,
                fullOutput: rawError,
                commandPreview: null,
                exitCode: null,
                observations: [],
                observationRecords: [],
                usedToolId: null,
                usedToolName: null,
                fallbackUsed: false,
                attempts: []
              }, `${part.toolName} failed`, rawError, rawError, undefined, {
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
      recommendedNextStep: finalTerminalState.recommendedNextStep,
      residualRisk: finalTerminalState.residualRisk,
      handoff: finalTerminalState.handoff,
      ...(finalTerminalState.blocked ? { blocked: finalTerminalState.blocked } : {}),
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

function validateCompletionHandoff(input: {
  stage: WorkflowStage;
  rawHandoff: Record<string, unknown> | null;
  findings: WorkflowReportedFinding[];
  attackVectors: WorkflowReportedAttackVector[];
}) {
  if (!input.stage.handoffSchema) {
    return input.rawHandoff;
  }

  if (!input.rawHandoff) {
    throw new RequestError(400, "Workflow completion requires a handoff that matches the stage handoff schema.");
  }

  const parsed = (() => {
    try {
      return parseAttackPathHandoff(input.rawHandoff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new RequestError(400, `Workflow handoff validation failed: ${formatZodIssues(error, "handoff")}`);
      }
      throw error;
    }
  })();
  const referenceErrors = validateAttackPathHandoffReferences({
    handoff: parsed,
    findingIds: input.findings.map((finding) => finding.id),
    vectorIds: input.attackVectors.map((vector) => vector.id)
  });
  if (referenceErrors.length > 0) {
    throw new RequestError(400, `Workflow handoff reference validation failed: ${referenceErrors.join("; ")}`);
  }

  return parsed;
}

function formatZodIssues(error: z.ZodError, rootPathLabel = "input") {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : rootPathLabel;
      return `${path}: ${issue.message}`;
    })
    .join("; ");
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
      throw new RequestError(400, `${label} validation failed: ${formatZodIssues(error, rootPathLabel)}`);
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
      throw new RequestError(400, `${label} parsing failed: ${reason}`);
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

  if (label !== "Finding submission") {
    return normalized;
  }

  if (typeof normalized["target"] === "string") {
    const host = normalized["target"].trim();
    if (host.length > 0) {
      normalized["target"] = { host };
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
  normalized["evidence"] = parseEvidenceArrayString(normalized["evidence"]);

  const mode = normalized["mode"];
  if (mode === "attack_vector") {
    normalized["transitionEvidence"] = parseEvidenceArrayString(normalized["transitionEvidence"]);
    if (!Array.isArray(normalized["attackVectors"])) {
      const hasFlatVectorFields = typeof normalized["kind"] === "string"
        && typeof normalized["sourceFindingId"] === "string"
        && typeof normalized["destinationFindingId"] === "string"
        && typeof normalized["summary"] === "string";
      if (hasFlatVectorFields) {
        normalized["attackVectors"] = [{
          kind: normalized["kind"],
          sourceFindingId: normalized["sourceFindingId"],
          destinationFindingId: normalized["destinationFindingId"],
          summary: normalized["summary"],
          preconditions: Array.isArray(normalized["preconditions"]) ? normalized["preconditions"] : [],
          impact: normalized["impact"],
          transitionEvidence: Array.isArray(normalized["transitionEvidence"]) ? normalized["transitionEvidence"] : [],
          confidence: normalized["confidence"],
          validationStatus: normalized["validationStatus"]
        }];
      }
    }
  } else if (mode === undefined && normalized["type"] !== undefined) {
    normalized["mode"] = "finding";
  }

  return normalized;
}

function evaluateCompletionAssertions(input: {
  completionRule: WorkflowStageCompletionRule;
  executedResults: ExecutedToolResult[];
  findings: WorkflowReportedFinding[];
  attackVectors: WorkflowReportedAttackVector[];
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
  const validatedAttackVectors = input.attackVectors.filter((vector) =>
    ["single_source", "cross_validated", "reproduced"].includes(vector.validationStatus)
  );
  const hasChainedFindings = validatedAttackVectors.length > 0 || input.findings.some((finding) =>
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
      ).length,
      attackVectorCount: validatedAttackVectors.length
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

function describeCompletionRuleForPrompt(stage: WorkflowStage) {
  const rule = stage.completionRule;
  const effectiveMinFindings = Math.max(0, rule.minFindings);
  const evidenceBackedWeaknessesRequired = rule.requireEvidenceBackedWeakness || effectiveMinFindings > 0 || !rule.allowEmptyResult;
  const reachableSurfaceRequired = rule.requireReachableSurface || rule.requireToolCall;
  const handoffRequired = Boolean(stage.handoffSchema);
  const failedToolOnlyBlocked = true;
  const lines = [
    "Active stage gate:",
    `- successful_evidence_tool_required: ${reachableSurfaceRequired ? "yes" : "no"}`,
    `- evidence_backed_findings_required: ${evidenceBackedWeaknessesRequired ? "yes" : "no"}`,
    `- minimum_reported_findings: ${effectiveMinFindings}`,
    `- blocked_completion_requires_failed_tool_runs: ${failedToolOnlyBlocked ? "yes" : "no"}`
  ];

  if (rule.requireOsiCoverageStatus) {
    lines.push("- osi_coverage_required: yes");
  }
  if (rule.requireChainedFindings) {
    lines.push("- chained_findings_required: yes");
  }
  if (handoffRequired) {
    lines.push("- handoff_required: yes");
  }

  lines.push(
    "Self-check before complete_run:",
    "- Count only findings that were submitted successfully with report_finding.",
    "- Missing findings, missing evidence, missing chain validation, or missing handoff data are not valid blocked reasons.",
    "- If a required weakness is supported by tool results but not yet reported, call report_finding before complete_run."
  );

  return lines.join("\n");
}

function buildReportFindingDescription(stage: WorkflowStage) {
  const lines = [
    "Persist findings and attack-vector links through one mode-based action.",
    "Use `mode: \"finding\"` for evidence-backed weaknesses. Include the required fields plus at least one evidence item with a persisted reference.",
    "Use `mode: \"attack_vector\"` only for transitions between existing finding ids."
  ];

  if (stage.completionRule.requireChainedFindings) {
    lines.push("This stage requires chained findings, so use attack vectors, relationship fields, chain metadata, or handoff attack paths to make the chain explicit.");
  }

  if (stage.handoffSchema) {
    lines.push("If you intend to complete with handoff, keep finding ids consistent with the final handoff references.");
  }

  return lines.join(" ");
}

function buildCompleteRunDescription(stage: WorkflowStage) {
  const lines = [
    "Finish the workflow run last.",
    "Use this only after the active stage gate is satisfied.",
    "Provide `summary`, `recommendedNextStep`, and `residualRisk`.",
    "It does not create findings and cannot compensate for missing findings or missing evidence.",
    "Use blocked completion only when actual failed or denied tool runs prevented validation, and include `blocked.failedToolRunIds` with those real toolRunId values.",
    "Do not use blocked completion to compensate for missing report_finding calls."
  ];

  if (stage.handoffSchema) {
    lines.push("This stage also requires `handoff` when the stage gate says handoff is required.");
    lines.push(ATTACK_PATH_HANDOFF_HINT);
  }

  return lines.join(" ");
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
