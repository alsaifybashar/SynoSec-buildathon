import {
  buildWorkflowTranscript,
  getToolLookup,
  localDemoTargetDefaults,
  localFullStackTargetDefaults,
  type AiAgent,
  type AiTool,
  type ExecutionReportDetail,
  type Workflow,
  type WorkflowEvaluationExpectation,
  type WorkflowEvaluationSubscore,
  type WorkflowEvaluationTargetPack,
  type WorkflowRun,
  type WorkflowRunEvaluationResponse
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/index.js";

type RunContext = {
  run: WorkflowRun;
  workflow: Workflow;
  targetBaseUrl: string | null;
  agents: AiAgent[];
  tools: AiTool[];
  executionReport: ExecutionReportDetail | null;
};

type PackScore = {
  score: number;
  summary: string;
  subscores: WorkflowEvaluationSubscore[];
  explanation: string[];
  matchedExpectations: WorkflowEvaluationExpectation[];
  unmetExpectations: WorkflowEvaluationExpectation[];
};

type ExpectationRule = {
  key: string;
  label: string;
  patterns: string[];
};

const vulnerableAppRules: ExpectationRule[] = [
  { key: "sqli-login", label: "SQL injection simulation on /login", patterns: ["/login", "sql injection", "sqli"] },
  { key: "admin-panel", label: "Unauthenticated admin panel on /admin", patterns: ["/admin", "admin panel"] },
  { key: "user-data-api", label: "Sensitive user data exposure on /api/users", patterns: ["/api/users", "user data", "sensitive data"] },
  { key: "files-listing", label: "Directory listing simulation on /files", patterns: ["/files", "directory listing", "listing"] },
  { key: "search-xss", label: "Reflected XSS on /search", patterns: ["/search", "reflected xss", "xss"] }
];

const fullStackTrackARules: ExpectationRule[] = [
  { key: "vendors", label: "Discovered /vendors", patterns: ["/vendors"] },
  { key: "vendor-invoice-idor", label: "Discovered invoice detail leak", patterns: ["/api/vendors", "/invoices", "idor", "approval code"] },
  { key: "finance-export-a", label: "Reached finance export via approval code path", patterns: ["/api/finance/export", "approval", "treasury"] }
];

const fullStackTrackBRules: ExpectationRule[] = [
  { key: "support-search", label: "Discovered support search recovery hints", patterns: ["/support/search", "recovery"] },
  { key: "support-case-idor", label: "Discovered support case leak", patterns: ["/api/support/cases", "recovery token", "case details"] },
  { key: "recover-session", label: "Reached finance export via recovery/session path", patterns: ["/api/auth/recover", "finance-manager session", "/api/finance/export", "session="] }
];

function normalizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return `${url.protocol}//${url.host}${pathname}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/, "");
  }
}

function gatherSearchCorpus(context: RunContext) {
  const parts: string[] = [];
  parts.push(JSON.stringify(context.run.events));
  if (context.executionReport) {
    parts.push(JSON.stringify(context.executionReport.findings));
    parts.push(JSON.stringify(context.executionReport.toolActivity));
    parts.push(JSON.stringify(context.executionReport.attackPaths));
    parts.push(JSON.stringify(context.executionReport.graph));
  }

  const transcript = buildWorkflowTranscript({
    workflow: context.workflow,
    run: context.run,
    agents: context.agents,
    toolLookup: getToolLookup(context.tools),
    running: context.run.status === "running"
  });
  parts.push(JSON.stringify(transcript));
  return parts.join("\n").toLowerCase();
}

function buildExpectation(corpus: string, rule: ExpectationRule): WorkflowEvaluationExpectation {
  const evidence = rule.patterns.filter((pattern) => corpus.includes(pattern.toLowerCase()));
  return {
    key: rule.key,
    label: rule.label,
    met: evidence.length > 0,
    evidence
  };
}

function scoreRunStatus(run: WorkflowRun) {
  switch (run.status) {
    case "completed":
      return 20;
    case "running":
      return 8;
    case "pending":
      return 3;
    case "failed":
    default:
      return 0;
  }
}

function scoreVulnerableApp(context: RunContext): PackScore {
  const corpus = gatherSearchCorpus(context);
  const expectations = vulnerableAppRules.map((rule) => buildExpectation(corpus, rule));
  const findingsCoverage = expectations.reduce((sum, entry) => sum + (entry.met ? 10 : 0), 0);
  const routeEvidenceScore = Math.min(
    20,
    ["/login", "/admin", "/api/users", "/files", "/search"]
      .reduce((sum, route) => sum + (corpus.includes(route) ? 4 : 0), 0)
  );
  const subscores: WorkflowEvaluationSubscore[] = [
    { key: "run-status", label: "Run status", score: scoreRunStatus(context.run), maxScore: 20 },
    { key: "report-present", label: "Execution report", score: context.executionReport ? 10 : 0, maxScore: 10 },
    { key: "finding-coverage", label: "Expected finding coverage", score: findingsCoverage, maxScore: 50 },
    { key: "evidence-coverage", label: "Expected evidence coverage", score: routeEvidenceScore, maxScore: 20 }
  ];
  const score = Math.min(100, subscores.reduce((sum, item) => sum + item.score, 0));
  const matchedExpectations = expectations.filter((entry) => entry.met);
  const unmetExpectations = expectations.filter((entry) => !entry.met);
  return {
    score,
    summary: `${matchedExpectations.length} of ${expectations.length} documented vulnerable-app expectations were matched.`,
    subscores,
    explanation: [
      `Run status contributed ${subscores[0]!.score} of 20.`,
      `${matchedExpectations.length} documented weakness families were matched with persisted run artifacts.`,
      `Route-level evidence contributed ${routeEvidenceScore} of 20.`
    ],
    matchedExpectations,
    unmetExpectations
  };
}

function scoreTrackExpectations(corpus: string, rules: ExpectationRule[], maxScore: number) {
  const expectations = rules.map((rule) => buildExpectation(corpus, rule));
  const stepScore = Math.floor(maxScore / rules.length);
  const remainder = maxScore - stepScore * rules.length;
  const score = expectations.reduce((sum, entry, index) => {
    if (!entry.met) {
      return sum;
    }
    return sum + stepScore + (index === rules.length - 1 ? remainder : 0);
  }, 0);
  return { expectations, score };
}

function scoreFullStackTarget(context: RunContext): PackScore {
  const corpus = gatherSearchCorpus(context);
  const trackA = scoreTrackExpectations(corpus, fullStackTrackARules, 25);
  const trackB = scoreTrackExpectations(corpus, fullStackTrackBRules, 25);
  const evidenceMarkers = ["/vendors", "/api/vendors", "/support/search", "/api/support/cases", "/api/auth/recover", "/api/finance/export"];
  const evidenceQuality = Math.min(20, evidenceMarkers.reduce((sum, marker) => sum + (corpus.includes(marker) ? 3 : 0), 0) + (context.executionReport ? 2 : 0));
  const subscores: WorkflowEvaluationSubscore[] = [
    { key: "run-status", label: "Run status", score: scoreRunStatus(context.run), maxScore: 20 },
    { key: "report-present", label: "Execution report", score: context.executionReport ? 10 : 0, maxScore: 10 },
    { key: "track-a", label: "Track A progression", score: trackA.score, maxScore: 25 },
    { key: "track-b", label: "Track B progression", score: trackB.score, maxScore: 25 },
    { key: "evidence-quality", label: "Evidence quality", score: evidenceQuality, maxScore: 20 }
  ];
  const score = Math.min(100, subscores.reduce((sum, item) => sum + item.score, 0));
  const expectations = [...trackA.expectations, ...trackB.expectations];
  const matchedExpectations = expectations.filter((entry) => entry.met);
  const unmetExpectations = expectations.filter((entry) => !entry.met);
  return {
    score,
    summary: `${matchedExpectations.length} of ${expectations.length} documented full-stack attack-track expectations were matched.`,
    subscores,
    explanation: [
      `Track A contributed ${trackA.score} of 25.`,
      `Track B contributed ${trackB.score} of 25.`,
      `Evidence quality contributed ${evidenceQuality} of 20.`
    ],
    matchedExpectations,
    unmetExpectations
  };
}

export class WorkflowRunEvaluationService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly targetsRepository: TargetsRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    private readonly aiToolsRepository: AiToolsRepository,
    private readonly executionReportsService: ExecutionReportsService
  ) {}

  async evaluateRun(runId: string): Promise<WorkflowRunEvaluationResponse> {
    const context = await this.loadRunContext(runId);
    const targetPack = this.resolveTargetPack(context.targetBaseUrl);
    if (!targetPack) {
      return {
        status: "unavailable",
        runId,
        reason: context.targetBaseUrl ? "unsupported_target" : "missing_target_context",
        label: "Not available",
        summary: context.targetBaseUrl
          ? `No workflow evaluation pack exists for ${context.targetBaseUrl}.`
          : "The selected workflow run does not have enough target context for evaluation."
      };
    }

    const result = targetPack === "vulnerable-app"
      ? scoreVulnerableApp(context)
      : scoreFullStackTarget(context);

    return {
      status: "available",
      runId,
      targetPack,
      score: result.score,
      label: `${result.score} / 100`,
      summary: result.summary,
      subscores: result.subscores,
      explanation: result.explanation,
      matchedExpectations: result.matchedExpectations,
      unmetExpectations: result.unmetExpectations
    };
  }

  private resolveTargetPack(targetBaseUrl: string | null): WorkflowEvaluationTargetPack | null {
    const normalized = normalizeUrl(targetBaseUrl);
    if (!normalized) {
      return null;
    }
    if (normalized === normalizeUrl(localDemoTargetDefaults.hostUrl) || normalized === normalizeUrl(localDemoTargetDefaults.internalUrl)) {
      return "vulnerable-app";
    }
    if (normalized === normalizeUrl(localFullStackTargetDefaults.hostUrl) || normalized === normalizeUrl(localFullStackTargetDefaults.internalUrl)) {
      return "full-stack-target";
    }
    return null;
  }

  private async loadRunContext(runId: string): Promise<RunContext> {
    const run = await this.workflowsRepository.getRunById(runId);
    if (!run) {
      throw new RequestError(404, "Workflow run not found.");
    }
    const workflow = await this.workflowsRepository.getById(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    const target = await this.targetsRepository.getById(run.targetId);
    const agents = await this.loadAgents(workflow);
    const tools = await this.loadTools(workflow, agents);
    const executionReport = await this.loadExecutionReport(run.id);

    return {
      run,
      workflow,
      targetBaseUrl: target?.executionBaseUrl ?? target?.baseUrl ?? null,
      agents,
      tools,
      executionReport
    };
  }

  private async loadExecutionReport(runId: string) {
    try {
      const result = await this.executionReportsService.list({
        page: 1,
        pageSize: 100,
        executionKind: "workflow",
        archived: "include",
        sortBy: "generatedAt",
        sortDirection: "desc"
      });
      const match = result.items.find((item) => item.executionId === runId);
      return match ? await this.executionReportsService.getById(match.id) : null;
    } catch {
      return null;
    }
  }

  private async loadAgents(workflow: Workflow) {
    const uniqueAgentIds = workflow.agentId ? [workflow.agentId] : [];
    const agents = await Promise.all(uniqueAgentIds.map(async (agentId) => this.aiAgentsRepository.getById(agentId)));
    return agents.filter((agent): agent is AiAgent => Boolean(agent));
  }

  private async loadTools(workflow: Workflow, agents: AiAgent[]) {
    const toolIds = new Set<string>();
    for (const toolId of workflow.allowedToolIds ?? []) {
      toolIds.add(toolId);
    }
    for (const agent of agents) {
      for (const toolId of agent.toolIds) {
        toolIds.add(toolId);
      }
    }
    const tools = await Promise.all([...toolIds].map(async (toolId) => this.aiToolsRepository.getById(toolId)));
    return tools.filter((tool): tool is AiTool => Boolean(tool));
  }
}
