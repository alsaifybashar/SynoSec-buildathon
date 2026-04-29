import type {
  AiTool,
  InternalObservation,
  Observation,
  Scan,
  StartWorkflowRunBody,
  WorkflowLaunch,
  ToolRequest,
  ToolRun,
  Workflow,
  WorkflowLiveModelOutput,
  WorkflowRun,
  WorkflowRunCoverageResponse,
  WorkflowRunFindingsResponse,
  WorkflowRunReport,
  WorkflowRunTranscriptResponse,
  WorkflowStage,
  WorkflowStageResult,
  WorkflowTraceEvent
} from "@synosec/contracts";
import type { ToolRuntime } from "@/modules/ai-tools/index.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/workflows.repository.js";
import type { FixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";
import type { EffectiveExecutionConstraintSet } from "./execution-constraints.js";
import type { WorkflowRunStream } from "./workflow-run-stream.js";

export interface WorkflowArtifactReader {
  getTranscript(runId: string): Promise<WorkflowRunTranscriptResponse>;
  getFindings(runId: string): Promise<WorkflowRunFindingsResponse>;
  getCoverage(runId: string): Promise<WorkflowRunCoverageResponse>;
  getReport(runId: string): Promise<WorkflowRunReport>;
}

export interface WorkflowRuntimePorts {
  workflowsRepository: WorkflowsRepository;
  targetsRepository: TargetsRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  toolRuntime: ToolRuntime;
  workflowRunStream: WorkflowRunStream;
  executionReportsService: ExecutionReportsService;
  fixedAiRuntime: FixedAiRuntime;
}

export type RuntimeStartContext = {
  workflow: Workflow;
  run: WorkflowRun;
  targetRecord: NonNullable<Awaited<ReturnType<TargetsRepository["getById"]>>>;
  constraintSet: EffectiveExecutionConstraintSet;
};

export type WorkflowStageExecutionContext = RuntimeStartContext & {
  stage: WorkflowStage;
};

export type WorkflowStageExecutionOutcome = {
  run: WorkflowRun;
  result: WorkflowStageResult;
};

export type StageExecutionTarget = {
  baseUrl: string;
  host: string;
  port?: number;
  displayBaseUrl?: string;
};

export type StageDependencies = {
  agent: NonNullable<Awaited<ReturnType<AiAgentsRepository["getById"]>>>;
  runtime: FixedAiRuntime;
  target: StageExecutionTarget;
  tools: AiTool[];
  excludedTools: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
};

export type ExecutedToolResult = {
  toolId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolRequest: ToolRequest;
  toolRun: ToolRun;
  status: ToolRun["status"];
  observations: InternalObservation[];
  publicObservations: Observation[];
  totalObservations: number;
  truncated: boolean;
  observationKeys: string[];
  observationSummaries: string[];
  outputPreview: string;
  fullOutput: string;
  commandPreview: string;
  exitCode?: number;
  usedToolId: string;
  usedToolName: string;
  fallbackUsed: boolean;
  attempts: Array<{
    toolId: string;
    toolName: string;
    status: ToolRun["status"];
    exitCode?: number;
    statusReason?: string;
    outputExcerpt: string;
    selected: boolean;
  }>;
};

export type PipelineTerminalState =
  {
    status: "completed";
    summary: string;
  };

export interface WorkflowRunWriterPort {
  appendEvent(
    run: WorkflowRun,
    event: WorkflowTraceEvent,
    patch?: {
      status?: WorkflowRun["status"];
      completedAt?: string | null;
      currentStepIndex?: number;
    },
    liveModelOutput?: WorkflowLiveModelOutput | null
  ): Promise<WorkflowRun>;
  publishSnapshot(run: WorkflowRun, liveModelOutput?: WorkflowLiveModelOutput | null): void;
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
    detail?: string | null,
    rawStreamPartType?: string
  ): WorkflowTraceEvent;
  createExecutionReport(runId: string): Promise<void>;
  cancelRunWithUserRequest(runId: string): Promise<WorkflowRun>;
  failRunWithStageError(run: WorkflowRun, workflowId: string, stage: WorkflowStage | null, error: unknown): Promise<WorkflowRun>;
  failWorkflowRunAfterUnhandledError(runId: string, workflowId: string, error: unknown): Promise<void>;
}

export interface WorkflowStageRunner {
  run(context: WorkflowStageExecutionContext): Promise<WorkflowStageExecutionOutcome>;
}

export interface WorkflowExecutionStrategy {
  supports(kind: Workflow["executionKind"] | undefined): boolean;
  execute(context: RuntimeStartContext): Promise<void>;
}

export interface WorkflowPreflightReader {
  loadRunContext(runId: string): Promise<{ run: WorkflowRun; workflow: Workflow }>;
}

export function createWorkflowScan(
  run: WorkflowRun,
  constraints: EffectiveExecutionConstraintSet,
  runtimeTarget?: { baseUrl: string; host: string; displayBaseUrl?: string }
): Scan {
  const scopedTargets = [
    constraints.normalizedTarget.host,
    constraints.normalizedTarget.baseUrl,
    runtimeTarget?.host,
    runtimeTarget?.baseUrl,
    runtimeTarget?.displayBaseUrl
  ].filter((value): value is string => Boolean(value?.trim()));

  return {
    id: run.id,
    scope: {
      targets: [...new Set(scopedTargets)],
      exclusions: constraints.excludedPaths,
      trustZones: [],
      connectivity: [],
      layers: ["L4", "L7"],
      maxDepth: 3,
      maxDurationMinutes: 15,
      rateLimitRps: constraints.rateLimitRps,
      allowActiveExploits: constraints.allowActiveExploit,
      cyberRangeMode: "live"
    },
    status: "running",
    currentRound: 0,
    tacticsTotal: 1,
    tacticsComplete: 0,
    createdAt: run.startedAt
  };
}

export type WorkflowRunLaunchInput = {
  workflowId: string;
  input?: StartWorkflowRunBody;
};

export type WorkflowLaunchResult = {
  launch: WorkflowLaunch;
  runIds: string[];
};
