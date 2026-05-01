import { existsSync, readFileSync } from "node:fs";
import {
  buildWorkflowTranscript,
  getToolLookup,
  localDemoTargetDefaults,
  localFullStackTargetDefaults,
  localJuiceShopTargetDefaults,
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
import { resolveWorkflowStageTools, type AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/index.js";

type RunContext = {
  run: WorkflowRun;
  workflow: Workflow;
  targetBaseUrl: string | null;
  tools: AiTool[];
  executionReport: ExecutionReportDetail | null;
};

type PackScore = {
  score: number;
  summary: string;
  subscores: WorkflowEvaluationSubscore[];
  explanation: string[];
  totalExpectations: number;
  unmetExpectationsTruncatedCount?: number;
  matchedExpectations: WorkflowEvaluationExpectation[];
  unmetExpectations: WorkflowEvaluationExpectation[];
};

type ExpectationRule = {
  key: string;
  label: string;
  patterns: string[];
  minMatches?: number;
};

type JuiceShopTargetPack = {
  id: string;
  version: string;
  categories: Array<{
    name: string;
    count: number;
    challengeKeys: string[];
  }>;
  challenges: Array<{
    key: string;
    name: string;
    category: string;
    difficulty: number;
    description: string;
    tags: string[];
    hintsCount: number;
    mitigationUrl: string | null;
    disabledEnv: string[];
    hasTutorial: boolean;
    tutorialOrder: number | null;
  }>;
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
  { key: "vendor-invoice-idor", label: "Discovered invoice detail leak", patterns: ["/api/vendors", "/invoices", "idor", "approval code"], minMatches: 2 },
  { key: "finance-export-a", label: "Reached finance export via approval code path", patterns: ["/api/finance/export", "approval", "treasury"], minMatches: 2 }
];

const fullStackTrackBRules: ExpectationRule[] = [
  { key: "support-search", label: "Discovered support search recovery hints", patterns: ["/support/search", "recovery"], minMatches: 2 },
  { key: "support-case-idor", label: "Discovered support case leak", patterns: ["/api/support/cases", "recovery token", "case details"], minMatches: 2 },
  { key: "recover-session", label: "Reached finance export via recovery/session path", patterns: ["/api/auth/recover", "finance-manager session", "session token", "/api/finance/export", "session="], minMatches: 2 }
];
const authLabRules: ExpectationRule[] = [
  { key: "preflight", label: "Captured preflight or CSRF/session setup evidence", patterns: ["preflight", "csrf", "session state"], minMatches: 1 },
  { key: "rate-limit", label: "Assessed rate-limit behavior", patterns: ["rate-limit check", "throttling", "429"], minMatches: 1 },
  { key: "oracle", label: "Assessed enumeration or oracle behavior", patterns: ["oracle check", "enumeration", "known-user", "unknown-user"], minMatches: 1 },
  { key: "artifact-validation", label: "Assessed artifact acceptance with baseline comparison", patterns: ["artifact", "baseline", "accepted supplied auth artifacts"], minMatches: 1 },
  { key: "explicit-success", label: "Used or reasoned about explicit success indicators", patterns: ["explicit success", "success hints", "dashboard-ready", "redirect"], minMatches: 1 }
];
const authLabToolIds = new Set([
  "native-auth-login-probe",
  "native-auth-artifact-validation",
  "native-auth-flow-probe"
]);

const JUICE_SHOP_UNMET_EXPECTATION_CAP = 25;
const JUICE_SHOP_TARGET_PACK_CANDIDATES = [
  new URL("../../../../../demos/juice-shop/target-pack.json", import.meta.url),
  new URL("../../../../../../demos/juice-shop/target-pack.json", import.meta.url)
];
const JUICE_SHOP_STOP_WORDS = new Set([
  "access",
  "account",
  "admin",
  "and",
  "api",
  "bonus",
  "challenge",
  "data",
  "file",
  "files",
  "for",
  "from",
  "into",
  "juice",
  "login",
  "password",
  "policy",
  "reset",
  "score",
  "section",
  "shop",
  "team",
  "the",
  "unsafe",
  "user",
  "users",
  "view",
  "with"
]);

const juiceShopTargetPack = loadJuiceShopTargetPack();

function resolveJuiceShopTargetPackUrl() {
  const match = JUICE_SHOP_TARGET_PACK_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error("Juice Shop target pack file was not found in any expected source or dist location.");
  }
  return match;
}

function loadJuiceShopTargetPack(): JuiceShopTargetPack {
  const packUrl = resolveJuiceShopTargetPackUrl();
  const raw = JSON.parse(readFileSync(packUrl, "utf8")) as Partial<JuiceShopTargetPack>;
  if (!raw || raw.id !== "owasp-juice-shop" || !Array.isArray(raw.categories) || !Array.isArray(raw.challenges)) {
    throw new Error(`Invalid Juice Shop target pack at ${packUrl.pathname}.`);
  }
  return raw as JuiceShopTargetPack;
}

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
    toolLookup: getToolLookup(context.tools),
    running: context.run.status === "running"
  });
  parts.push(JSON.stringify(transcript));
  return parts.join("\n").toLowerCase();
}

function gatherPhaseCorpus(run: WorkflowRun, phase: string) {
  return JSON.stringify(
    run.events.filter((event) => {
      const payload = event.payload;
      return typeof payload === "object"
        && payload !== null
        && !Array.isArray(payload)
        && payload["phase"] === phase;
    })
  ).toLowerCase();
}

function buildExpectation(corpus: string, rule: ExpectationRule): WorkflowEvaluationExpectation {
  const evidence = rule.patterns.filter((pattern) => corpus.includes(pattern.toLowerCase()));
  return {
    key: rule.key,
    label: rule.label,
    met: evidence.length >= (rule.minMatches ?? 1),
    evidence
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function tokenizeSignificant(value: string) {
  return [...new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !JUICE_SHOP_STOP_WORDS.has(token))
  )];
}

function extractDescriptionLiterals(value: string) {
  const normalized = stripHtml(value).toLowerCase();
  const literals = new Set<string>();
  for (const match of normalized.matchAll(/\/[a-z0-9._\-/?=&%#]+/g)) {
    literals.add(match[0]);
  }
  for (const match of normalized.matchAll(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/g)) {
    literals.add(match[0]);
  }
  for (const match of normalized.matchAll(/\b[a-z0-9._-]+\.(?:md|pdf|xml|json|yml|yaml|txt|zip|bak|db|csv|svg|png|jpg|jpeg)\b/g)) {
    literals.add(match[0]);
  }
  return [...literals];
}

function buildJuiceShopExpectation(corpus: string, challenge: JuiceShopTargetPack["challenges"][number]): WorkflowEvaluationExpectation {
  const normalizedName = normalizeWhitespace(stripHtml(challenge.name)).toLowerCase();
  const normalizedDescription = normalizeWhitespace(stripHtml(challenge.description)).toLowerCase();
  const exactPatterns = [
    normalizedName,
    challenge.key.toLowerCase(),
    ...extractDescriptionLiterals(challenge.description)
  ].filter((pattern) => pattern.length > 0);
  const matchedExactPatterns = exactPatterns.filter((pattern) => corpus.includes(pattern));
  const nameTokens = tokenizeSignificant(normalizedName);
  const descriptionTokens = tokenizeSignificant(normalizedDescription).slice(0, 4);
  const matchedNameTokens = nameTokens.filter((token) => corpus.includes(token));
  const matchedDescriptionTokens = descriptionTokens.filter((token) => corpus.includes(token));
  const tokenThreshold = nameTokens.length <= 2 ? nameTokens.length : 2;
  const hasNameTokenMatch = tokenThreshold > 0 && matchedNameTokens.length >= tokenThreshold;
  const hasDescriptionTokenSupport = matchedDescriptionTokens.length >= Math.min(2, descriptionTokens.length) && matchedDescriptionTokens.length > 0;
  const met = matchedExactPatterns.length > 0 || hasNameTokenMatch || (hasDescriptionTokenSupport && matchedNameTokens.length > 0);
  const evidence = [
    ...matchedExactPatterns,
    ...matchedNameTokens.map((token) => `token:${token}`),
    ...matchedDescriptionTokens.map((token) => `description:${token}`)
  ];

  return {
    key: challenge.key,
    label: `${challenge.name} (${challenge.category})`,
    met,
    evidence: [...new Set(evidence)]
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

function scoreExecutionQuality(run: WorkflowRun) {
  const failedEvents = run.events.filter((event) => event.status === "failed");
  const failedToolResults = failedEvents.filter((event) => event.type === "tool_result").length;
  const failedReportingEvents = failedEvents.filter((event) => event.title.toLowerCase().includes("report")).length;
  const penalty = Math.min(10, failedToolResults + failedReportingEvents * 2);
  return {
    score: Math.max(0, 10 - penalty),
    failedToolResults,
    failedReportingEvents
  };
}

function scoreVulnerableApp(context: RunContext): PackScore {
  const corpus = gatherSearchCorpus(context);
  const preambleCorpus = context.run.preRunEvidenceEnabled ? gatherPhaseCorpus(context.run, "pre_run") : "";
  const expectations = vulnerableAppRules.map((rule) => buildExpectation(corpus, rule));
  const findingsCoverage = expectations.reduce((sum, entry) => sum + (entry.met ? 10 : 0), 0);
  const routeEvidenceScore = Math.min(
    10,
    ["/login", "/admin", "/api/users", "/files", "/search"]
      .reduce((sum, route) => sum + ((preambleCorpus || corpus).includes(route) ? 2 : 0), 0)
  );
  const executionQuality = scoreExecutionQuality(context.run);
  const subscores: WorkflowEvaluationSubscore[] = [
    { key: "run-status", label: "Run status", score: scoreRunStatus(context.run), maxScore: 20 },
    { key: "report-present", label: "Execution report", score: context.executionReport ? 10 : 0, maxScore: 10 },
    { key: "finding-coverage", label: "Expected finding coverage", score: findingsCoverage, maxScore: 50 },
    { key: "evidence-coverage", label: "Expected evidence coverage", score: routeEvidenceScore, maxScore: 10 },
    { key: "execution-quality", label: "Execution quality", score: executionQuality.score, maxScore: 10 }
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
      context.run.preRunEvidenceEnabled
        ? `Scan preamble route evidence contributed ${routeEvidenceScore} of 10.`
        : `Route-level evidence contributed ${routeEvidenceScore} of 10.`,
      `Execution quality contributed ${executionQuality.score} of 10 after ${executionQuality.failedToolResults} failed tool results and ${executionQuality.failedReportingEvents} failed reporting steps.`
    ],
    totalExpectations: expectations.length,
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
  const preambleCorpus = context.run.preRunEvidenceEnabled ? gatherPhaseCorpus(context.run, "pre_run") : "";
  const trackA = scoreTrackExpectations(corpus, fullStackTrackARules, 25);
  const trackB = scoreTrackExpectations(corpus, fullStackTrackBRules, 25);
  const evidenceMarkers = ["/vendors", "/api/vendors", "/support/search", "/api/support/cases", "/api/auth/recover", "/api/finance/export"];
  const evidenceQuality = Math.min(10, evidenceMarkers.reduce((sum, marker) => sum + ((preambleCorpus || corpus).includes(marker) ? 2 : 0), 0));
  const executionQuality = scoreExecutionQuality(context.run);
  const subscores: WorkflowEvaluationSubscore[] = [
    { key: "run-status", label: "Run status", score: scoreRunStatus(context.run), maxScore: 20 },
    { key: "report-present", label: "Execution report", score: context.executionReport ? 10 : 0, maxScore: 10 },
    { key: "track-a", label: "Track A progression", score: trackA.score, maxScore: 25 },
    { key: "track-b", label: "Track B progression", score: trackB.score, maxScore: 25 },
    { key: "evidence-quality", label: "Evidence quality", score: evidenceQuality, maxScore: 10 },
    { key: "execution-quality", label: "Execution quality", score: executionQuality.score, maxScore: 10 }
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
      context.run.preRunEvidenceEnabled
        ? `Scan preamble evidence quality contributed ${evidenceQuality} of 10.`
        : `Evidence quality contributed ${evidenceQuality} of 10.`,
      `Execution quality contributed ${executionQuality.score} of 10 after ${executionQuality.failedToolResults} failed tool results and ${executionQuality.failedReportingEvents} failed reporting steps.`
    ],
    totalExpectations: expectations.length,
    matchedExpectations,
    unmetExpectations
  };
}

function scoreJuiceShop(context: RunContext): PackScore {
  const corpus = gatherSearchCorpus(context);
  const preambleCorpus = context.run.preRunEvidenceEnabled ? gatherPhaseCorpus(context.run, "pre_run") : "";
  const expectations = juiceShopTargetPack.challenges.map((challenge) => buildJuiceShopExpectation(corpus, challenge));
  const matchedExpectations = expectations.filter((entry) => entry.met);
  const unmetExpectations = expectations.filter((entry) => !entry.met);
  const matchedChallengeKeys = new Set(matchedExpectations.map((entry) => entry.key));
  const matchedCategoryCount = juiceShopTargetPack.categories.reduce((count, category) => (
    category.challengeKeys.some((key) => matchedChallengeKeys.has(key)) ? count + 1 : count
  ), 0);
  const challengeCoverage = Math.round((matchedExpectations.length / expectations.length) * 50);
  const categoryCoverage = Math.round((matchedCategoryCount / juiceShopTargetPack.categories.length) * 10);
  const executionQuality = scoreExecutionQuality(context.run);
  const subscores: WorkflowEvaluationSubscore[] = [
    { key: "run-status", label: "Run status", score: scoreRunStatus(context.run), maxScore: 20 },
    { key: "report-present", label: "Execution report", score: context.executionReport ? 10 : 0, maxScore: 10 },
    { key: "challenge-coverage", label: "Challenge coverage", score: challengeCoverage, maxScore: 50 },
    { key: "category-coverage", label: "Category coverage", score: categoryCoverage, maxScore: 10 },
    { key: "execution-quality", label: "Execution quality", score: executionQuality.score, maxScore: 10 }
  ];
  const score = Math.min(100, subscores.reduce((sum, item) => sum + item.score, 0));
  const unmetExpectationsTruncatedCount = Math.max(0, unmetExpectations.length - JUICE_SHOP_UNMET_EXPECTATION_CAP);
  const visibleUnmetExpectations = unmetExpectations.slice(0, JUICE_SHOP_UNMET_EXPECTATION_CAP);
  const explanation = [
    `${matchedExpectations.length} of ${expectations.length} Juice Shop challenges were matched with persisted run artifacts.`,
    context.run.preRunEvidenceEnabled
      ? `${matchedCategoryCount} of ${juiceShopTargetPack.categories.length} Juice Shop challenge categories were represented, while scan preamble baseline markers covered ${["/rest", "/api", "/ftp", "/score-board"].reduce((sum, marker) => sum + (preambleCorpus.includes(marker) ? 1 : 0), 0)} key surfaces.`
      : `${matchedCategoryCount} of ${juiceShopTargetPack.categories.length} Juice Shop challenge categories were represented in the matched evidence.`,
    `Execution quality contributed ${executionQuality.score} of 10 after ${executionQuality.failedToolResults} failed tool results and ${executionQuality.failedReportingEvents} failed reporting steps.`
  ];
  if (unmetExpectationsTruncatedCount > 0) {
    explanation.push(`Unmet expectations were capped to ${JUICE_SHOP_UNMET_EXPECTATION_CAP} entries for API and UI usability; ${unmetExpectationsTruncatedCount} additional unmatched challenges were omitted from the response body.`);
  }

  return {
    score,
    summary: `${matchedExpectations.length} of ${expectations.length} documented Juice Shop challenges were matched across ${matchedCategoryCount} of ${juiceShopTargetPack.categories.length} categories.`,
    subscores,
    explanation,
    totalExpectations: expectations.length,
    unmetExpectationsTruncatedCount,
    matchedExpectations,
    unmetExpectations: visibleUnmetExpectations
  };
}

function scoreAuthLab(context: RunContext): PackScore {
  const corpus = context.run.preRunEvidenceEnabled ? gatherPhaseCorpus(context.run, "pre_run") : gatherSearchCorpus(context);
  const expectations = authLabRules.map((rule) => buildExpectation(corpus, rule));
  const matchedExpectations = expectations.filter((entry) => entry.met);
  const unmetExpectations = expectations.filter((entry) => !entry.met);
  const executionQuality = scoreExecutionQuality(context.run);
  const authToolCoverage = Math.min(10, context.tools.filter((tool) => authLabToolIds.has(tool.id)).length * 4);
  const expectationScore = expectations.reduce((sum, expectation) => sum + (expectation.met ? 10 : 0), 0);
  const subscores: WorkflowEvaluationSubscore[] = [
    { key: "run-status", label: "Run status", score: scoreRunStatus(context.run), maxScore: 20 },
    { key: "report-present", label: "Execution report", score: context.executionReport ? 10 : 0, maxScore: 10 },
    { key: "auth-behavior", label: "Auth behavior coverage", score: expectationScore, maxScore: 50 },
    { key: "tool-coverage", label: "Auth tool coverage", score: authToolCoverage, maxScore: 10 },
    { key: "execution-quality", label: "Execution quality", score: executionQuality.score, maxScore: 10 }
  ];
  return {
    score: Math.min(100, subscores.reduce((sum, item) => sum + item.score, 0)),
    summary: `${matchedExpectations.length} of ${expectations.length} auth-lab expectations were matched.`,
    subscores,
    explanation: [
      `${matchedExpectations.length} auth-specific expectations were matched from run artifacts.`,
      `Auth tool coverage contributed ${authToolCoverage} of 10.`,
      `Execution quality contributed ${executionQuality.score} of 10 after ${executionQuality.failedToolResults} failed tool results and ${executionQuality.failedReportingEvents} failed reporting steps.`
    ],
    totalExpectations: expectations.length,
    matchedExpectations,
    unmetExpectations
  };
}

export class WorkflowRunEvaluationService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly targetsRepository: TargetsRepository,
    private readonly aiToolsRepository: AiToolsRepository,
    private readonly executionReportsService: ExecutionReportsService
  ) {}

  async evaluateRun(runId: string): Promise<WorkflowRunEvaluationResponse> {
    const context = await this.loadRunContext(runId);
    const targetPack = this.resolveTargetPack(context);
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
      : targetPack === "full-stack-target"
        ? scoreFullStackTarget(context)
        : targetPack === "juice-shop"
          ? scoreJuiceShop(context)
          : scoreAuthLab(context);

    return {
      status: "available",
      runId,
      targetPack,
      score: result.score,
      label: `${result.score} / 100`,
      summary: result.summary,
      subscores: result.subscores,
      explanation: result.explanation,
      totalExpectations: result.totalExpectations,
      ...(result.unmetExpectationsTruncatedCount
        ? { unmetExpectationsTruncatedCount: result.unmetExpectationsTruncatedCount }
        : {}),
      matchedExpectations: result.matchedExpectations,
      unmetExpectations: result.unmetExpectations
    };
  }

  private resolveTargetPack(context: RunContext): WorkflowEvaluationTargetPack | null {
    const normalized = normalizeUrl(context.targetBaseUrl);
    if (normalized === normalizeUrl(localDemoTargetDefaults.hostUrl) || normalized === normalizeUrl(localDemoTargetDefaults.internalUrl)) {
      return "vulnerable-app";
    }
    if (normalized === normalizeUrl(localFullStackTargetDefaults.hostUrl) || normalized === normalizeUrl(localFullStackTargetDefaults.internalUrl)) {
      return "full-stack-target";
    }
    if (normalized === normalizeUrl(localJuiceShopTargetDefaults.hostUrl) || normalized === normalizeUrl(localJuiceShopTargetDefaults.internalUrl)) {
      return "juice-shop";
    }
    if (context.tools.length > 0 && context.tools.every((tool) => authLabToolIds.has(tool.id))) {
      return "auth-lab";
    }
    if (!normalized) {
      return null;
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
    const tools = await this.loadTools(workflow);
    const executionReport = await this.loadExecutionReport(run.id);

    return {
      run,
      workflow,
      targetBaseUrl: target?.executionBaseUrl ?? target?.baseUrl ?? null,
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

  private async loadTools(workflow: Workflow) {
    const registryPage = await this.aiToolsRepository.list({
      page: 1,
      pageSize: 100,
      sortBy: "name",
      sortDirection: "asc"
    });
    const toolIds = new Set<string>();
    for (const stage of workflow.stages) {
      for (const tool of resolveWorkflowStageTools(registryPage.items, stage.allowedToolIds)) {
        toolIds.add(tool.id);
      }
      for (const toolId of stage.allowedToolIds) {
        toolIds.add(toolId);
      }
    }
    const tools = await Promise.all([...toolIds].map(async (toolId) => this.aiToolsRepository.getById(toolId)));
    return tools.filter((tool): tool is AiTool => Boolean(tool));
  }
}
