import { stepCountIs, streamText, tool as createSdkTool, type LanguageModel } from "ai";
import { randomUUID } from "node:crypto";
import type {
  Scan,
  Workflow,
  WorkflowAttackVectorSubmission,
  WorkflowLiveModelOutput,
  WorkflowReportedAttackVector,
  WorkflowReportedFinding,
  WorkflowReportedFindingBatchItem,
  WorkflowReportedFindingRelationship,
  WorkflowReportedPath,
  WorkflowReportedResource,
  WorkflowReportedResourceRelationship,
  WorkflowRun,
  WorkflowStage,
  WorkflowStageResult,
  WorkflowTraceEvent
} from "@synosec/contracts";
import {
  defaultWorkflowExecutionContract,
  getWorkflowReportedSystemGraph,
  getWorkflowReportedAttackVectors,
  getWorkflowReportedFindings,
  workflowExecutionContractHeading,
  workflowAttackVectorSubmissionSchema,
  workflowFindingSubmissionSchema,
  workflowReportAttackVectorsSubmissionSchema,
  workflowReportSystemGraphBatchSubmissionSchema
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
    const workflowOwnsExecutionContract = renderedStageSystemPrompt.includes(workflowExecutionContractHeading);
    const systemPrompt = [
      renderedStageSystemPrompt,
      targetContextPrompt,
      workflowOwnsExecutionContract ? null : defaultWorkflowExecutionContract
    ].filter((part): part is string => typeof part === "string" && part.trim().length > 0).join("\n\n");
    const builtinLifecycleToolNames = new Set([
      "log_progress",
      "report_system_graph_batch",
      "complete_run"
    ]);
    const exposedToolName = (tool: { id: string; executorType: string }) => {
      if (tool.executorType === "bash" && tool.id === "seed-agent-bash-command") {
        return "bash";
      }
      return tool.id;
    };
    const evidenceToolEntries: Array<{
      exposedName: string;
      tool: typeof tools[number];
      description: string;
      execute: (rawInput: unknown) => Promise<unknown>;
    }> = [];
    for (const tool of tools) {
      if (tool.executorType === "bash" && tool.bashSource) {
        const exposedName = exposedToolName(tool);
        evidenceToolEntries.push({
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
              id: toolRun.id,
              toolRunId: toolRun.id,
              toolId: tool.id,
              toolName: exposedName,
              status: toolRun.status,
              summary: result.outputPreview,
              outputPreview: result.outputPreview,
              observations: result.publicObservations,
              totalObservations: result.totalObservations,
              truncated: result.truncated
            };
          }
        });
        continue;
      }

      if (tool.executorType !== "builtin" || !tool.builtinActionKey || builtinLifecycleToolNames.has(tool.builtinActionKey)) {
        continue;
      }

      const familyDefinition = getSemanticFamilyDefinition(tool.builtinActionKey);
      if (!familyDefinition) {
        throw new RequestError(500, `Workflow capability tool ${tool.name} is missing its execution definition.`);
      }

      evidenceToolEntries.push({
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
      });
    }
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
          { name: "report_system_graph_batch", description: buildReportSystemGraphBatchDescription(stage) },
          { name: "complete_run", description: buildCompleteRunDescription(stage) }
        ]
      }
    ]);

    await appendEvent("system_message", "completed", {
      title: "Rendered system prompt",
      summary: workflowOwnsExecutionContract
        ? "Persisted the exact system prompt delivered to the workflow model, including workflow-owned execution contract text and engine-generated target context."
        : "Persisted the exact system prompt delivered to the workflow model, including engine-generated target and runtime contract context.",
      body: systemPrompt,
      messageKind: "prompt",
      promptKind: "system",
      promptSourceLabel: workflowOwnsExecutionContract
        ? "Workflow-owned editable system prompt including the workflow execution contract, plus engine-generated target context."
        : "Workflow-owned editable system prompt plus engine-generated target context and runtime contract.",
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
    const reportedSystemGraph = getWorkflowReportedSystemGraph(currentRun);
    const reportedResources = new Map(reportedSystemGraph.resources.map((resource) => [resource.id, resource]));
    const reportedResourceRelationships = new Map(reportedSystemGraph.resourceRelationships.map((relationship) => [relationship.id, relationship]));
    const reportedFindings = new Map(getWorkflowReportedFindings(currentRun).map((finding) => [finding.id, finding]));
    const reportedFindingRelationships = new Map(reportedSystemGraph.findingRelationships.map((relationship) => [relationship.id, relationship]));
    const reportedPaths = new Map(reportedSystemGraph.paths.map((path) => [path.id, path]));
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
      || [...reportedAttackVectors.values()].some((vector) => vector.transitionEvidence.some((entry) => entry.artifactRef === artifactRef))
      || [...reportedResources.values()].some((resource) => (resource.evidence ?? []).some((entry) => entry.artifactRef === artifactRef))
      || [...reportedResourceRelationships.values()].some((relationship) => (relationship.evidence ?? []).some((entry) => entry.artifactRef === artifactRef))
      || [...reportedFindingRelationships.values()].some((relationship) => (relationship.evidence ?? []).some((entry) => entry.artifactRef === artifactRef));
    const findExecutedResultByToolRunRef = (toolRunRef: string) => executedResults.find((result) => result.toolRun.id === toolRunRef) ?? null;
    const findExecutedResultBySourceTool = (sourceTool: string) => {
      const candidates = executedResults.filter((result) => result.toolName === sourceTool || result.toolId === sourceTool);
      return candidates.length === 1 ? candidates[0]! : null;
    };
    const normalizeJsonRecord = <TValue extends Record<string, unknown>>(value: TValue) => JSON.parse(JSON.stringify(value)) as TValue;

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
      const toolRunRef = typeof item["toolRunRef"] === "string" ? item["toolRunRef"] : null;
      const observationRef = typeof item["observationRef"] === "string" ? item["observationRef"] : null;
      const artifactRef = typeof item["artifactRef"] === "string" ? item["artifactRef"] : null;
      const traceEventId = typeof item["traceEventId"] === "string" ? item["traceEventId"] : null;
      if (toolRunRef || observationRef || artifactRef || traceEventId) {
        if (sourceTool) {
          return item;
        }
        const matchingResult = toolRunRef ? findExecutedResultByToolRunRef(toolRunRef) : null;
        if (!matchingResult) {
          return item;
        }
        return {
          ...item,
          sourceTool: matchingResult.toolName
        };
      }
      if (!sourceTool) {
        return item;
      }
      const candidate = findExecutedResultBySourceTool(sourceTool);
      if (!candidate) {
        return item;
      }
      return {
        ...item,
        toolRunRef: candidate.toolRun.id
      };
    });

    const hasGroundedEvidenceReference = (item: Record<string, unknown>) => Boolean(
      typeof item["artifactRef"] === "string"
      || typeof item["observationRef"] === "string"
      || typeof item["toolRunRef"] === "string"
      || typeof item["traceEventId"] === "string"
      || typeof item["externalUrl"] === "string"
    );

    const assertGroundedEvidenceRecords = (
      evidence: Array<Record<string, unknown>>,
      entityLabel: string
    ) => {
      for (const [index, item] of evidence.entries()) {
        if (hasGroundedEvidenceReference(item)) {
          continue;
        }
        const sourceTool = typeof item["sourceTool"] === "string" ? item["sourceTool"].trim() : "";
        const groundingHint = sourceTool
          ? ` Source tool \`${sourceTool}\` did not resolve to exactly one executed result in this run.`
          : "";
        throw new RequestError(
          400,
          `${entityLabel} evidence[${index}] could not be grounded to persisted evidence.${groundingHint} Provide toolRunRef, observationRef, artifactRef, traceEventId, or externalUrl.`
        );
      }
    };

    const relaxedFindingEvidenceToolInputSchema = z.object({
      sourceTool: z.string().min(1).optional(),
      quote: z.string().min(1),
      artifactRef: z.string().min(1).optional(),
      observationRef: z.string().min(1).optional(),
      toolRunRef: z.string().min(1).optional(),
      traceEventId: z.string().uuid().optional(),
      externalUrl: z.string().url().optional()
    }).strict().refine((value) => Boolean(
      value.sourceTool
      || value.artifactRef
      || value.observationRef
      || value.toolRunRef
      || value.traceEventId
      || value.externalUrl
    ), {
      message: "Evidence records require sourceTool or another persisted evidence reference."
    });
    const relaxedAttackVectorSubmissionToolInputSchema = z.object({
      kind: z.enum(["enables", "derived_from", "related", "lateral_movement"]),
      sourceFindingId: z.string().min(1),
      destinationFindingId: z.string().min(1),
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
      }).strict().optional(),
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
      }).strict().optional(),
      explanationSummary: z.string().min(1).optional(),
      confidenceReason: z.string().min(1).optional(),
      relationshipExplanations: z.object({
        derivedFrom: z.string().min(1).optional(),
        relatedTo: z.string().min(1).optional(),
        enables: z.string().min(1).optional(),
        chainRole: z.string().min(1).optional()
      }).strict().optional(),
      tags: z.array(z.string().min(1)).optional(),
    }).strict();
    const reportAttackVectorsToolInputSchema = z.object({
      attackVectors: z.array(relaxedAttackVectorSubmissionToolInputSchema).min(1)
    }).strict();
    const reportSystemGraphBatchToolInputSchema = z.object({
      resources: z.array(z.object({
        id: z.string().min(1),
        kind: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        summary: z.string().min(1).optional(),
        evidence: z.array(relaxedFindingEvidenceToolInputSchema).optional(),
        tags: z.array(z.string().min(1)).optional()
      }).strict()).optional(),
      resourceRelationships: z.array(z.object({
        id: z.string().min(1),
        kind: z.string().min(1).optional(),
        sourceResourceId: z.string().min(1).optional(),
        targetResourceId: z.string().min(1).optional(),
        summary: z.string().min(1).optional(),
        evidence: z.array(relaxedFindingEvidenceToolInputSchema).optional()
      }).strict()).optional(),
      findings: z.array(reportFindingToolInputSchema.extend({
        id: z.string().min(1),
        resourceId: z.string().min(1).optional(),
        resourceIds: z.array(z.string().min(1)).optional()
      }).strict()).optional(),
      findingRelationships: z.array(z.object({
        id: z.string().min(1),
        kind: z.enum(["enables", "derived_from", "related", "lateral_movement"]).optional(),
        sourceFindingId: z.string().min(1).optional(),
        targetFindingId: z.string().min(1).optional(),
        summary: z.string().min(1).optional(),
        impact: z.string().min(1).optional(),
        confidence: coerceNumericString(z.number().min(0).max(1)).optional(),
        validationStatus: z.enum(["unverified", "suspected", "single_source", "cross_validated", "reproduced", "blocked", "rejected"]).optional(),
        evidence: z.array(relaxedFindingEvidenceToolInputSchema).optional()
      }).strict()).optional(),
      paths: z.array(z.object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        summary: z.string().min(1).optional(),
        severity: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
        resourceIds: z.array(z.string().min(1)).optional(),
        findingIds: z.array(z.string().min(1)).optional()
      }).strict()).optional()
    }).strict();

    const validateEvidenceRefs = (evidence: Array<{
      traceEventId?: string | undefined;
      toolRunRef?: string | undefined;
      observationRef?: string | undefined;
      artifactRef?: string | undefined;
    }>) => {
      for (const entry of evidence) {
        if (entry.traceEventId && !hasTraceEvent(entry.traceEventId)) {
          throw new RequestError(400, `Unknown trace event reference: ${entry.traceEventId}`);
        }
        if (entry.toolRunRef && !hasToolRunRef(entry.toolRunRef)) {
          throw new RequestError(400, `Unknown tool run reference: ${entry.toolRunRef}`);
        }
        if (entry.observationRef && !hasObservationRef(entry.observationRef)) {
          throw new RequestError(400, `Unknown observation reference: ${entry.observationRef}`);
        }
        if (entry.artifactRef && !hasArtifactRef(entry.artifactRef)) {
          throw new RequestError(400, `Unknown artifact reference: ${entry.artifactRef}`);
        }
      }
    };

    const assertUniqueStableIds = (collectionName: string, ids: string[]) => {
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) {
          throw new RequestError(400, `Duplicate id in ${collectionName}: ${id}`);
        }
        seen.add(id);
      }
    };

    const withDefinedValues = <TRecord extends Record<string, unknown>>(value: TRecord) => Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined)
    ) as Partial<TRecord>;

    const mergeResource = (
      existing: Record<string, unknown> | undefined,
      patch: NonNullable<z.infer<typeof reportSystemGraphBatchToolInputSchema>["resources"]>[number]
    ): WorkflowReportedResource => ({
      ...(existing ?? {}),
      ...withDefinedValues({
        id: patch.id.trim(),
        kind: patch.kind?.trim(),
        name: patch.name?.trim(),
        summary: patch.summary,
        evidence: patch.evidence ? hydrateEvidenceRefs(patch.evidence) : undefined,
        tags: patch.tags
      })
    } as WorkflowReportedResource);

    const mergeResourceRelationship = (
      existing: Record<string, unknown> | undefined,
      patch: NonNullable<z.infer<typeof reportSystemGraphBatchToolInputSchema>["resourceRelationships"]>[number]
    ): WorkflowReportedResourceRelationship => ({
      ...(existing ?? {}),
      ...withDefinedValues({
        id: patch.id.trim(),
        kind: patch.kind?.trim(),
        sourceResourceId: patch.sourceResourceId?.trim(),
        targetResourceId: patch.targetResourceId?.trim(),
        summary: patch.summary,
        evidence: patch.evidence ? hydrateEvidenceRefs(patch.evidence) : undefined
      })
    } as WorkflowReportedResourceRelationship);

    const mergePath = (
      existing: Record<string, unknown> | undefined,
      patch: NonNullable<z.infer<typeof reportSystemGraphBatchToolInputSchema>["paths"]>[number]
    ): WorkflowReportedPath => ({
      ...(existing ?? {}),
      ...withDefinedValues({
        id: patch.id.trim(),
        title: patch.title?.trim(),
        summary: patch.summary,
        severity: patch.severity,
        resourceIds: patch.resourceIds,
        findingIds: patch.findingIds
      })
    } as WorkflowReportedPath);

    const mergeFindingRelationship = (
      existing: Record<string, unknown> | undefined,
      patch: NonNullable<z.infer<typeof reportSystemGraphBatchToolInputSchema>["findingRelationships"]>[number]
    ): WorkflowReportedFindingRelationship => ({
      ...(existing ?? {}),
      ...withDefinedValues({
        id: patch.id.trim(),
        kind: patch.kind,
        sourceFindingId: patch.sourceFindingId?.trim(),
        targetFindingId: patch.targetFindingId?.trim(),
        summary: patch.summary,
        impact: patch.impact,
        confidence: patch.confidence,
        validationStatus: patch.validationStatus,
        evidence: patch.evidence ? hydrateEvidenceRefs(patch.evidence) : undefined
      })
    } as WorkflowReportedFindingRelationship);

    const requireField = <TValue extends string>(value: TValue | undefined, message: string): TValue => {
      if (!value || value.trim().length === 0) {
        throw new RequestError(400, message);
      }
      return value;
    };

    const submitSystemGraphBatch = async (rawInput: unknown) => {
      const reportInput = parseWorkflowToolInput(reportSystemGraphBatchToolInputSchema, rawInput, "System graph batch submission");
      assertUniqueStableIds("resources", (reportInput.resources ?? []).map((item) => item.id.trim()));
      assertUniqueStableIds("resourceRelationships", (reportInput.resourceRelationships ?? []).map((item) => item.id.trim()));
      assertUniqueStableIds("findings", (reportInput.findings ?? []).map((item) => item.id.trim()));
      assertUniqueStableIds("findingRelationships", (reportInput.findingRelationships ?? []).map((item) => item.id.trim()));
      assertUniqueStableIds("paths", (reportInput.paths ?? []).map((item) => item.id.trim()));

      const mergedResources = (reportInput.resources ?? []).map((resource) => mergeResource(reportedResources.get(resource.id.trim()), resource));
      const mergedResourceRelationships = (reportInput.resourceRelationships ?? []).map((relationship) => {
        const merged = mergeResourceRelationship(reportedResourceRelationships.get(relationship.id.trim()), relationship);
        if (merged.evidence) {
          assertGroundedEvidenceRecords(merged.evidence as Array<Record<string, unknown>>, `Resource relationship ${merged.id}`);
        }
        return merged;
      });
      const mergedFindingRelationships = (reportInput.findingRelationships ?? []).map((relationship) => {
        const merged = mergeFindingRelationship(reportedFindingRelationships.get(relationship.id.trim()), relationship);
        if (merged.evidence) {
          assertGroundedEvidenceRecords(merged.evidence as Array<Record<string, unknown>>, `Finding relationship ${merged.id}`);
        }
        return merged;
      });
      const mergedPaths = (reportInput.paths ?? []).map((path) => mergePath(reportedPaths.get(path.id.trim()), path));

      for (const [index, resource] of mergedResources.entries()) {
        requireField(resource.kind, `Resource ${reportInput.resources?.[index]?.id ?? resource.id} requires kind on first submission.`);
        requireField(resource.name, `Resource ${reportInput.resources?.[index]?.id ?? resource.id} requires name on first submission.`);
      }
      for (const [index, relationship] of mergedResourceRelationships.entries()) {
        requireField(relationship.kind, `Resource relationship ${reportInput.resourceRelationships?.[index]?.id ?? relationship.id} requires kind on first submission.`);
        requireField(relationship.sourceResourceId, `Resource relationship ${reportInput.resourceRelationships?.[index]?.id ?? relationship.id} requires sourceResourceId on first submission.`);
        requireField(relationship.targetResourceId, `Resource relationship ${reportInput.resourceRelationships?.[index]?.id ?? relationship.id} requires targetResourceId on first submission.`);
        requireField(relationship.summary, `Resource relationship ${reportInput.resourceRelationships?.[index]?.id ?? relationship.id} requires summary on first submission.`);
      }
      for (const [index, relationship] of mergedFindingRelationships.entries()) {
        requireField(relationship.kind, `Finding relationship ${reportInput.findingRelationships?.[index]?.id ?? relationship.id} requires kind on first submission.`);
        requireField(relationship.sourceFindingId, `Finding relationship ${reportInput.findingRelationships?.[index]?.id ?? relationship.id} requires sourceFindingId on first submission.`);
        requireField(relationship.targetFindingId, `Finding relationship ${reportInput.findingRelationships?.[index]?.id ?? relationship.id} requires targetFindingId on first submission.`);
        requireField(relationship.summary, `Finding relationship ${reportInput.findingRelationships?.[index]?.id ?? relationship.id} requires summary on first submission.`);
      }
      for (const [index, path] of mergedPaths.entries()) {
        requireField(path.title, `Path ${reportInput.paths?.[index]?.id ?? path.id} requires title on first submission.`);
      }

      const canonicalFindings = await Promise.all((reportInput.findings ?? []).map(async (finding) => {
        const existing = reportedFindings.get(finding.id.trim());
        const mergedTarget = {
          host: finding.target?.host?.trim() ?? existing?.target.host ?? target.host,
          ...(finding.target?.port !== undefined
            ? { port: finding.target.port }
            : existing?.target.port !== undefined
              ? { port: existing.target.port }
              : {}),
          ...(finding.target?.url
            ? { url: finding.target.url }
            : existing?.target.url
              ? { url: existing.target.url }
              : {}),
          ...(finding.target?.path
            ? { path: finding.target.path }
            : existing?.target.path
              ? { path: existing.target.path }
              : {})
        };
        const mergedEvidence = finding.evidence
          ? hydrateEvidenceRefs(finding.evidence)
          : existing?.evidence;
        const findingSubmission = parseWorkflowToolInput(workflowFindingSubmissionSchema, {
          type: finding.type ?? existing?.type ?? "other",
          title: finding.title ?? existing?.title,
          severity: finding.severity ?? existing?.severity ?? "medium",
          confidence: finding.confidence ?? existing?.confidence ?? 0.8,
          target: mergedTarget,
          evidence: mergedEvidence,
          impact: finding.impact ?? existing?.impact ?? `Evidence indicates: ${finding.title ?? existing?.title ?? finding.id}`,
          recommendation: finding.recommendation ?? existing?.recommendation ?? "Review and remediate the reported issue based on the supporting evidence.",
          validationStatus: finding.validationStatus ?? existing?.validationStatus ?? "unverified",
          cwe: finding.cwe ?? existing?.cwe,
          mitreId: finding.mitreId ?? existing?.mitreId,
          owasp: finding.owasp ?? existing?.owasp,
          reproduction: finding.reproduction ?? existing?.reproduction,
          resourceId: finding.resourceId ?? existing?.resourceId,
          resourceIds: finding.resourceIds ?? existing?.resourceIds ?? [],
          derivedFromFindingIds: existing?.derivedFromFindingIds ?? [],
          relatedFindingIds: existing?.relatedFindingIds ?? [],
          enablesFindingIds: existing?.enablesFindingIds ?? [],
          chain: existing?.chain,
          explanationSummary: finding.explanationSummary ?? existing?.explanationSummary,
          confidenceReason: finding.confidenceReason ?? existing?.confidenceReason,
          relationshipExplanations: finding.relationshipExplanations ?? existing?.relationshipExplanations,
          tags: finding.tags ?? existing?.tags ?? []
        }, "Finding submission");
        const referenceError = validateFindingEvidenceReferences(findingSubmission, executedResults);
        if (referenceError) {
          throw new RequestError(400, referenceError);
        }
        validateEvidenceRefs(findingSubmission.evidence);
        const verification = verifyFindingEvidence(findingSubmission, executedResults);
        if (verification.validationStatus === "rejected") {
          throw new RequestError(400, verification.reason);
        }
        return {
          ...findingSubmission,
          id: finding.id.trim(),
          confidence: verification.confidence,
          validationStatus: verification.validationStatus,
          resourceIds: findingSubmission.resourceIds ?? [],
          confidenceReason: findingSubmission.confidenceReason
            ? `${findingSubmission.confidenceReason} ${verification.reason}`.trim()
            : verification.reason
        };
      }));

      const canonicalResources = mergedResources.map((resource) => ({
        id: resource.id,
        kind: requireField(resource.kind, `Resource ${resource.id} requires kind on first submission.`),
        name: requireField(resource.name, `Resource ${resource.id} requires name on first submission.`),
        ...(resource.summary ? { summary: resource.summary } : {}),
        evidence: resource.evidence ?? [],
        tags: resource.tags ?? []
      }));
      const canonicalResourceRelationships = mergedResourceRelationships.map((relationship) => ({
        id: relationship.id,
        kind: requireField(relationship.kind, `Resource relationship ${relationship.id} requires kind on first submission.`),
        sourceResourceId: requireField(relationship.sourceResourceId, `Resource relationship ${relationship.id} requires sourceResourceId on first submission.`),
        targetResourceId: requireField(relationship.targetResourceId, `Resource relationship ${relationship.id} requires targetResourceId on first submission.`),
        summary: requireField(relationship.summary, `Resource relationship ${relationship.id} requires summary on first submission.`),
        evidence: relationship.evidence ?? []
      }));
      const canonicalFindingRelationships = mergedFindingRelationships.map((relationship) => ({
        id: relationship.id,
        kind: requireField(relationship.kind, `Finding relationship ${relationship.id} requires kind on first submission.`),
        sourceFindingId: requireField(relationship.sourceFindingId, `Finding relationship ${relationship.id} requires sourceFindingId on first submission.`),
        targetFindingId: requireField(relationship.targetFindingId, `Finding relationship ${relationship.id} requires targetFindingId on first submission.`),
        summary: requireField(relationship.summary, `Finding relationship ${relationship.id} requires summary on first submission.`),
        ...(relationship.impact ? { impact: relationship.impact } : {}),
        confidence: relationship.confidence ?? 0.8,
        validationStatus: relationship.validationStatus ?? "unverified",
        evidence: relationship.evidence ?? []
      }));
      const canonicalPaths = mergedPaths.map((path) => ({
        id: path.id,
        title: requireField(path.title, `Path ${path.id} requires title on first submission.`),
        ...(path.summary ? { summary: path.summary } : {}),
        ...(path.severity ? { severity: path.severity } : {}),
        resourceIds: path.resourceIds ?? [],
        findingIds: path.findingIds ?? []
      }));

      const batchInput = {
        resources: canonicalResources,
        resourceRelationships: canonicalResourceRelationships,
        findings: canonicalFindings,
        findingRelationships: canonicalFindingRelationships,
        paths: canonicalPaths
      };
      parseWorkflowToolInput(workflowReportSystemGraphBatchSubmissionSchema, batchInput, "System graph batch submission");
      const persistedBatch: {
        resources: WorkflowReportedResource[];
        resourceRelationships: WorkflowReportedResourceRelationship[];
        findings: WorkflowReportedFindingBatchItem[];
        findingRelationships: WorkflowReportedFindingRelationship[];
        paths: WorkflowReportedPath[];
      } = normalizeJsonRecord({
        resources: batchInput.resources.map((resource) => ({
          ...resource,
          evidence: resource.evidence ?? [],
          tags: resource.tags ?? []
        })),
        resourceRelationships: batchInput.resourceRelationships.map((relationship) => ({
          ...relationship,
          evidence: relationship.evidence ?? []
        })),
        findings: batchInput.findings.map((finding) => ({
          ...finding,
          resourceIds: finding.resourceIds ?? [],
          derivedFromFindingIds: finding.derivedFromFindingIds ?? [],
          relatedFindingIds: finding.relatedFindingIds ?? [],
          enablesFindingIds: finding.enablesFindingIds ?? [],
          tags: finding.tags ?? []
        })),
        findingRelationships: batchInput.findingRelationships.map((relationship) => ({
          ...relationship,
          evidence: relationship.evidence ?? []
        })),
        paths: batchInput.paths.map((path) => ({
          ...path,
          resourceIds: path.resourceIds ?? [],
          findingIds: path.findingIds ?? []
        }))
      });

      for (const resource of persistedBatch.resources) {
        validateEvidenceRefs(resource.evidence ?? []);
      }
      for (const relationship of persistedBatch.resourceRelationships) {
        validateEvidenceRefs(relationship.evidence ?? []);
      }
      for (const relationship of persistedBatch.findingRelationships) {
        validateEvidenceRefs(relationship.evidence ?? []);
      }

      const knownResourceIds = new Set([...reportedResources.keys(), ...persistedBatch.resources.map((item) => item.id)]);
      const knownFindingIds = new Set([...reportedFindings.keys(), ...persistedBatch.findings.map((item) => item.id)]);

      for (const relationship of persistedBatch.resourceRelationships) {
        if (!knownResourceIds.has(relationship.sourceResourceId)) {
          throw new RequestError(400, `Unknown source resource reference: ${relationship.sourceResourceId}`);
        }
        if (!knownResourceIds.has(relationship.targetResourceId)) {
          throw new RequestError(400, `Unknown target resource reference: ${relationship.targetResourceId}`);
        }
      }
      for (const finding of persistedBatch.findings) {
        const referencedResourceIds = new Set([...(finding.resourceId ? [finding.resourceId] : []), ...finding.resourceIds]);
        if (referencedResourceIds.size === 0) {
          throw new RequestError(400, `Finding ${finding.id} must reference at least one resource id.`);
        }
        for (const resourceId of referencedResourceIds) {
          if (!knownResourceIds.has(resourceId)) {
            throw new RequestError(400, `Unknown finding resource reference: ${resourceId}`);
          }
        }
      }
      for (const relationship of persistedBatch.findingRelationships) {
        if (!knownFindingIds.has(relationship.sourceFindingId)) {
          throw new RequestError(400, `Unknown source finding reference: ${relationship.sourceFindingId}`);
        }
        if (!knownFindingIds.has(relationship.targetFindingId)) {
          throw new RequestError(400, `Unknown target finding reference: ${relationship.targetFindingId}`);
        }
      }
      for (const path of persistedBatch.paths) {
        for (const resourceId of path.resourceIds ?? []) {
          if (!knownResourceIds.has(resourceId)) {
            throw new RequestError(400, `Unknown path resource reference: ${resourceId}`);
          }
        }
        for (const findingId of path.findingIds ?? []) {
          if (!knownFindingIds.has(findingId)) {
            throw new RequestError(400, `Unknown path finding reference: ${findingId}`);
          }
        }
      }

      for (const resource of persistedBatch.resources) {
        reportedResources.set(resource.id, resource as WorkflowReportedResource);
      }
      for (const relationship of persistedBatch.resourceRelationships) {
        reportedResourceRelationships.set(relationship.id, relationship as WorkflowReportedResourceRelationship);
      }

      const persistedFindings = persistedBatch.findings.map((finding) => createWorkflowReportedFinding({
        runId: currentRun.id,
        id: finding.id,
        submission: {
          ...finding,
          target: {
            host: finding.target?.host ?? target.host,
            ...(finding.target?.port === undefined ? {} : { port: finding.target.port }),
            ...(finding.target?.url ? { url: finding.target.url } : {}),
            ...(finding.target?.path ? { path: finding.target.path } : {})
          },
          resourceIds: finding.resourceIds ?? []
        },
        createdAt: reportedFindings.get(finding.id)?.createdAt ?? new Date().toISOString()
      })).map((finding) => normalizeJsonRecord(finding));
      for (const finding of persistedFindings) {
        reportedFindings.set(finding.id, finding);
      }

      const persistedFindingRelationships = persistedBatch.findingRelationships
        .map((relationship) => normalizeJsonRecord(relationship as WorkflowReportedFindingRelationship));
      for (const relationship of persistedFindingRelationships) {
        reportedFindingRelationships.set(relationship.id, relationship);
        reportedAttackVectors.set(relationship.id, normalizeJsonRecord(createWorkflowReportedAttackVector({
          runId: currentRun.id,
          id: relationship.id,
          createdAt: reportedAttackVectors.get(relationship.id)?.createdAt ?? new Date().toISOString(),
          submission: {
            kind: relationship.kind,
            sourceFindingId: relationship.sourceFindingId,
            destinationFindingId: relationship.targetFindingId,
            summary: relationship.summary,
            preconditions: [],
            impact: relationship.impact ?? relationship.summary,
            transitionEvidence: relationship.evidence,
            confidence: relationship.confidence,
            validationStatus: relationship.validationStatus
          }
        })));
      }
      for (const path of persistedBatch.paths) {
        reportedPaths.set(path.id, path as WorkflowReportedPath);
      }

      await appendEvent("system_graph_reported", "completed", {
        batch: persistedBatch
      }, "System graph batch reported", `Merged ${persistedBatch.resources.length} resources, ${persistedBatch.findings.length} findings, and ${persistedBatch.findingRelationships.length + persistedBatch.resourceRelationships.length} relationships.`, JSON.stringify(persistedBatch, null, 2));

      for (const finding of persistedFindings) {
        await appendEvent("finding_reported", "completed", {
          finding
        }, `Finding reported: ${finding.title}`, `${finding.severity.toUpperCase()} ${finding.type} on ${finding.target.host}.`, finding.impact);
      }

      for (const relationship of reportedAttackVectors.values()) {
        if (!persistedFindingRelationships.some((item) => item.id === relationship.id)) {
          continue;
        }
        await appendEvent("attack_vector_reported", "completed", {
          attackVector: relationship
        }, `Finding relationship reported: ${relationship.kind}`, `${relationship.kind} from ${relationship.sourceFindingId} to ${relationship.destinationFindingId}.`, relationship.summary);
      }

      return {
        accepted: true,
        resourceIds: persistedBatch.resources.map((item) => item.id),
        findingIds: persistedFindings.map((item) => item.id),
        relationshipIds: [
          ...persistedBatch.resourceRelationships.map((item) => item.id),
          ...persistedFindingRelationships.map((item) => item.id)
        ],
        pathIds: persistedBatch.paths.map((item) => item.id)
      };
    };

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
      report_system_graph_batch: createSdkTool({
        description: buildReportSystemGraphBatchDescription(stage),
        inputSchema: reportSystemGraphBatchToolInputSchema,
        execute: async (rawInput) => submitSystemGraphBatch(rawInput)
      }),
      report_finding: createSdkTool({
        description: "Compatibility alias for report_system_graph_batch. Prefer report_system_graph_batch in new workflows.",
        inputSchema: reportFindingToolInputSchema,
        execute: async (rawInput) => {
          const normalizedInput = normalizeWorkflowToolInput(rawInput, "Finding submission");
          rejectUnsupportedFindingFields(normalizedInput);
          const reportInput = parseWorkflowToolInput(reportFindingToolInputSchema, normalizedInput, "Finding submission");
          const resourceId = reportInput.target?.host?.trim()?.length
            ? `resource:${reportInput.target.host.trim()}`
            : `resource:${target.host}`;
          const output = await submitSystemGraphBatch({
            resources: [{
              id: resourceId,
              kind: "host",
              name: reportInput.target?.host?.trim() || target.host
            }],
            findings: [{
              id: randomUUID(),
              ...reportInput,
              resourceId,
              resourceIds: [resourceId]
            }]
          });
          const findingId = output.findingIds[0] ?? "";
          const finding = reportedFindings.get(findingId);
          return {
            accepted: true,
            findingId,
            title: finding?.title ?? reportInput.title ?? "Finding",
            severity: finding?.severity ?? reportInput.severity ?? "medium",
            host: finding?.target.host ?? reportInput.target?.host ?? target.host
          };
        }
      }),
      report_attack_vectors: createSdkTool({
        description: "Compatibility alias for report_system_graph_batch. Prefer report_system_graph_batch in new workflows.",
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
          const output = await submitSystemGraphBatch({
            findingRelationships: parsedVectors.attackVectors.map((vector) => ({
              id: randomUUID(),
              kind: vector.kind,
              sourceFindingId: vector.sourceFindingId,
              targetFindingId: vector.destinationFindingId,
              summary: vector.summary,
              impact: vector.impact,
              confidence: vector.confidence,
              validationStatus: vector.validationStatus,
              evidence: vector.transitionEvidence
            }))
          });
          return {
            accepted: true,
            attackVectorIds: output.relationshipIds
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
            const toolRunId = typeof part.output === "object" && part.output !== null
              && (("toolRunId" in part.output && typeof part.output.toolRunId === "string")
                || ("id" in part.output && typeof part.output.id === "string"))
              ? ("toolRunId" in part.output && typeof part.output.toolRunId === "string" ? part.output.toolRunId : part.output.id)
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
                  id: matchingResult.toolRun.id,
                  summary: outputPreview
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
              observations: matchingResult?.publicObservations ?? [],
              totalObservations: matchingResult?.totalObservations ?? 0,
              truncated: matchingResult?.truncated ?? false,
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
                id: matchingResult?.toolRun.id ?? `${part.toolCallId}-failed`,
                summary: rawError
              },
              summary: rawError,
              outputPreview: rawError,
              observations: [],
              totalObservations: matchingResult?.totalObservations ?? 0,
              truncated: false,
              commandPreview: matchingResult?.commandPreview ?? null,
              exitCode: matchingResult?.exitCode ?? null
            }, `${part.toolName} failed`, rawError, JSON.stringify({
              id: matchingResult?.toolRun.id ?? `${part.toolCallId}-failed`,
              summary: rawError
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
                id: part.toolCallId,
                summary: outputPreview
              };
              persistedToolResultIds.add(part.toolCallId);
              await appendEvent("tool_result", "completed", {
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                toolId: null,
                output: publicOutput,
                summary: outputPreview,
                outputPreview,
                observations: [],
                totalObservations: 0,
                truncated: false,
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
                  id: `${part.toolCallId}-failed`,
                  summary: rawError
                },
                summary: rawError,
                outputPreview: rawError,
                observations: [],
                totalObservations: 0,
                truncated: false,
                commandPreview: null,
                exitCode: null
              }, `${part.toolName} failed`, rawError, JSON.stringify({
                id: `${part.toolCallId}-failed`,
                summary: rawError
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
  toolName: "report_finding" | "report_attack_vectors" | "report_system_graph_batch",
  message: string,
  options?: { cause?: unknown }
) {
  const actionLabel = toolName === "report_finding"
    ? "Finding submission"
    : toolName === "report_attack_vectors"
      ? "Attack vector submission"
      : "System graph batch submission";
  return new RequestError(400, message, {
    cause: options?.cause,
    code: toolName === "report_finding"
      ? "WORKFLOW_REPORT_FINDING_INVALID"
      : toolName === "report_attack_vectors"
        ? "WORKFLOW_REPORT_ATTACK_VECTORS_INVALID"
        : "WORKFLOW_REPORT_SYSTEM_GRAPH_BATCH_INVALID",
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
      const toolName = label === "Finding submission"
        ? "report_finding"
        : label === "Attack vector submission"
          ? "report_attack_vectors"
          : "report_system_graph_batch";
      throw workflowToolValidationError(
        toolName,
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
      const toolName = label === "Finding submission"
        ? "report_finding"
        : label === "Attack vector submission"
          ? "report_attack_vectors"
          : "report_system_graph_batch";
      throw workflowToolValidationError(
        toolName,
        `${label} parsing failed: ${reason}`,
        { cause: error }
      );
    }
  })();

  return coerceWorkflowToolInput(parsedInput, label);
}

function coerceWorkflowToolInput(rawInput: unknown, label: string): unknown {
  if (label !== "Finding submission" && label !== "Attack vector submission" && label !== "System graph batch submission") {
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

  if (label === "Attack vector submission") {
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

  if (label === "System graph batch submission") {
    const normalizeEvidenceList = (value: unknown) => parseEvidenceArrayString(value);
    if (Array.isArray(normalized["findings"])) {
      normalized["findings"] = normalized["findings"].map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return entry;
        }
        const finding = { ...(entry as Record<string, unknown>) };
        if (typeof finding["confidence"] === "string") {
          const parsedConfidence = Number(finding["confidence"]);
          if (Number.isFinite(parsedConfidence)) {
            finding["confidence"] = parsedConfidence;
          }
        }
        if (typeof finding["target"] === "string") {
          const host = finding["target"].trim();
          if (host.length > 0) {
            finding["target"] = { host };
          }
        }
        finding["evidence"] = normalizeEvidenceList(finding["evidence"]);
        return finding;
      });
    }
    if (Array.isArray(normalized["resourceRelationships"])) {
      normalized["resourceRelationships"] = normalized["resourceRelationships"].map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return entry;
        }
        return {
          ...(entry as Record<string, unknown>),
          evidence: normalizeEvidenceList((entry as Record<string, unknown>)["evidence"])
        };
      });
    }
    if (Array.isArray(normalized["resources"])) {
      normalized["resources"] = normalized["resources"].map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return entry;
        }
        return {
          ...(entry as Record<string, unknown>),
          evidence: normalizeEvidenceList((entry as Record<string, unknown>)["evidence"])
        };
      });
    }
    if (Array.isArray(normalized["findingRelationships"])) {
      normalized["findingRelationships"] = normalized["findingRelationships"].map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return entry;
        }
        const relationship = { ...(entry as Record<string, unknown>) };
        relationship["evidence"] = normalizeEvidenceList(relationship["evidence"]);
        if (typeof relationship["confidence"] === "string") {
          const parsedConfidence = Number(relationship["confidence"]);
          if (Number.isFinite(parsedConfidence)) {
            relationship["confidence"] = parsedConfidence;
          }
        }
        return relationship;
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

function buildReportSystemGraphBatchDescription(stage: WorkflowStage) {
  const lines = [
    "Persist one incremental workflow system-graph batch.",
    "Gather evidence first, then submit resources, resourceRelationships, findings, findingRelationships, and optional paths in one normalized payload.",
    "Use stable ids across batches so later submissions refine prior entities instead of duplicating them.",
    "Attach every finding to concrete resource ids and avoid prose-only topology claims."
  ];

  if (stage.completionRule.requireChainedFindings) {
    lines.push("This stage requires chained findings, so submit explicit findingRelationships or paths that capture the progression.");
  }

  if (stage.handoffSchema) {
    lines.push("If you intend to complete with handoff, keep resource ids and finding ids consistent with the final handoff references.");
  }

  return lines.join(" ");
}

function buildCompleteRunDescription(_stage: WorkflowStage) {
  return "Finish the workflow run last. Provide only `summary`. This action closes the workflow run and does not create findings.";
}
