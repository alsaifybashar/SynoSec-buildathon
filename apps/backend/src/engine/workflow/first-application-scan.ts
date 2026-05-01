import type { AiTool } from "@synosec/contracts";
import type { ExecutedToolResult, StageExecutionTarget } from "./workflow-runtime-types.js";

const GENERIC_INPUT_KEYS = new Set(["target", "baseUrl", "url", "startUrl", "domain", "port"]);

const ROLE_ORDER = ["reachability", "metadata", "content-discovery", "crawl-expansion", "network-services"] as const;
type FirstScanRole = typeof ROLE_ORDER[number];

type PlannedTool = {
  tool: AiTool;
  role: FirstScanRole;
  family: string;
  priority: number;
};

type FirstScanObservation = {
  summary: string;
  sourceToolName: string;
  ref: string;
  confidence: number;
  group: "routes" | "services" | "technologies" | "artifacts" | "auth" | "anomalies" | "general";
  rank: number;
  excerpt: string;
};

const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*m/g;

export type FirstApplicationScanSummary = {
  promptSection: string;
  groupedObservationCount: number;
  keyFindingCount: number;
  excerptCount: number;
};

const ROLE_LIMITS = new Map<FirstScanRole, number>([
  ["reachability", 1],
  ["metadata", 1],
  ["content-discovery", 1],
  ["crawl-expansion", 1],
  ["network-services", 1]
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSchemaKeys(tool: Pick<AiTool, "inputSchema">) {
  const schema = isRecord(tool.inputSchema) ? tool.inputSchema : null;
  const schemaProperties = schema?.["properties"];
  const properties = isRecord(schemaProperties) ? schemaProperties : null;
  const schemaRequired = schema?.["required"];
  const required = Array.isArray(schemaRequired)
    ? schemaRequired.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];

  return {
    propertyKeys: properties ? Object.keys(properties) : [],
    requiredKeys: required
  };
}

function isResolvableDomainTarget(target: Pick<StageExecutionTarget, "host">) {
  return target.host.includes(".") && target.host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(target.host);
}

function inferFamily(tool: Pick<AiTool, "id" | "name" | "capabilities">) {
  const text = `${tool.id} ${tool.name} ${(tool.capabilities ?? []).join(" ")}`.toLowerCase();
  if (text.includes("http-recon")) {
    return "http-recon";
  }
  if (text.includes("http-header")) {
    return "http-headers";
  }
  if (text.includes("web-crawl") || text.includes("crawler")) {
    return "web-crawl";
  }
  if (text.includes("content-discovery")) {
    return "content-discovery";
  }
  if (text.includes("ffuf")) {
    return "ffuf";
  }
  if (text.includes("gobuster")) {
    return "gobuster";
  }
  if (text.includes("dirb")) {
    return "dirb";
  }
  if (text.includes("nmap")) {
    return "nmap";
  }
  if (text.includes("service-fingerprint")) {
    return "service-fingerprint";
  }
  if (text.includes("service-scan")) {
    return "service-scan";
  }
  if (text.includes("tls-audit")) {
    return "tls-audit";
  }
  if (text.includes("netcat") || text.includes("ncat")) {
    return "netcat";
  }
  if (text.includes("auth-flow-probe")) {
    return "auth-flow-probe";
  }
  if (text.includes("nikto")) {
    return "nikto";
  }
  if (text.includes("vuln-audit")) {
    return "vuln-audit";
  }
  return tool.id.toLowerCase();
}

function inferRole(tool: Pick<AiTool, "id" | "name" | "capabilities" | "category">): FirstScanRole | null {
  const family = inferFamily(tool);
  if (family === "http-recon") {
    return "reachability";
  }
  if (family === "http-headers" || family === "tls-audit") {
    return "metadata";
  }
  if (family === "content-discovery" || family === "ffuf" || family === "gobuster" || family === "dirb") {
    return "content-discovery";
  }
  if (family === "web-crawl") {
    return "crawl-expansion";
  }
  if (family === "nmap" || family === "service-fingerprint" || family === "service-scan" || family === "netcat") {
    return "network-services";
  }
  if (tool.category === "network") {
    return "network-services";
  }
  if (tool.category === "content") {
    return "content-discovery";
  }
  if (tool.category === "web") {
    return "reachability";
  }
  return null;
}

function scoreToolPriority(tool: Pick<AiTool, "id" | "name" | "capabilities">, role: FirstScanRole, target: StageExecutionTarget) {
  const family = inferFamily(tool);
  const seededPriority: Record<string, number> = {
    "http-recon": 100,
    "http-headers": 90,
    "content-discovery": 100,
    "web-crawl": 95,
    "nmap": 100,
    "service-fingerprint": 92,
    "service-scan": 88,
    "ffuf": 70,
    "gobuster": 68,
    "dirb": 66,
    "tls-audit": target.baseUrl.startsWith("https://") ? 94 : 40,
    "netcat": 50
  };
  const roleAdjustment: Record<FirstScanRole, number> = {
    "reachability": family === "http-recon" ? 10 : 0,
    "metadata": family === "http-headers" ? 8 : 0,
    "content-discovery": family === "content-discovery" ? 8 : 0,
    "crawl-expansion": family === "web-crawl" ? 8 : 0,
    "network-services": family === "nmap" ? 8 : 0
  };
  return (seededPriority[family] ?? 40) + roleAdjustment[role];
}

function isEligibleTool(tool: AiTool, target: StageExecutionTarget) {
  if (tool.status !== "active" || tool.kind !== "raw-adapter") {
    return false;
  }
  if (tool.executorType !== "bash" || !tool.bashSource || tool.accessProfile === "shell") {
    return false;
  }
  if (tool.riskTier === "controlled-exploit") {
    return false;
  }

  const family = inferFamily(tool);
  if (family === "nikto" || family === "vuln-audit" || family === "auth-flow-probe") {
    return false;
  }

  const { propertyKeys, requiredKeys } = getSchemaKeys(tool);
  const genericKeys = propertyKeys.filter((key) => GENERIC_INPUT_KEYS.has(key));
  if (genericKeys.length === 0 || requiredKeys.some((key) => !GENERIC_INPUT_KEYS.has(key))) {
    return false;
  }
  if (requiredKeys.includes("domain") && !isResolvableDomainTarget(target)) {
    return false;
  }
  if (requiredKeys.includes("port") && target.port === undefined) {
    return false;
  }

  return inferRole(tool) !== null;
}

export function buildFirstApplicationScanToolInput(tool: AiTool, target: StageExecutionTarget) {
  const { propertyKeys } = getSchemaKeys(tool);
  const input: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (propertyKeys.includes(key) && value !== undefined && value !== null && value !== "") {
      input[key] = value;
    }
  };

  assign("target", target.host);
  assign("baseUrl", target.baseUrl);
  assign("url", target.baseUrl);
  assign("startUrl", target.baseUrl);
  assign("port", target.port);
  if (isResolvableDomainTarget(target)) {
    assign("domain", target.host);
  }

  return input;
}

export function resolveFirstApplicationScanTools(tools: AiTool[], target: StageExecutionTarget) {
  const candidates: PlannedTool[] = tools
    .filter((tool) => isEligibleTool(tool, target))
    .map((tool) => {
      const role = inferRole(tool);
      if (!role) {
        return null;
      }
      const family = inferFamily(tool);
      return {
        tool,
        role,
        family,
        priority: scoreToolPriority(tool, role, target)
      };
    })
    .filter((entry): entry is PlannedTool => Boolean(entry));

  const selected: PlannedTool[] = [];
  const selectedFamilies = new Set<string>();
  for (const role of ROLE_ORDER) {
    const roleLimit = ROLE_LIMITS.get(role) ?? 1;
    const planned = candidates
      .filter((entry) => entry.role === role)
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority;
        }
        return left.tool.name.localeCompare(right.tool.name);
      });

    for (const candidate of planned) {
      if (selectedFamilies.has(candidate.family)) {
        continue;
      }
      if (selected.filter((entry) => entry.role === role).length >= roleLimit) {
        break;
      }
      selected.push(candidate);
      selectedFamilies.add(candidate.family);
    }
  }

  return selected;
}

function classifyObservationGroup(text: string): FirstScanObservation["group"] {
  const normalized = text.toLowerCase();
  if (/(?:\d+\/(?:tcp|udp|http|https|ssh|smtp)\b|ports?\s+\d+|reachable ports?|service|protocol|tls\b|open\s+port)/.test(normalized)) {
    return "services";
  }
  if (/(?:\/[a-z0-9._\-/?=&%#]+|endpoint|route|robots\.txt|security\.txt|sitemap|directory listing|login page|admin|api\/)/.test(normalized)) {
    return "routes";
  }
  if (/(?:server:|x-powered-by|framework|technology|nginx|apache|express|react|vue|next\.js|wordpress|drupal|php|node\.js)/.test(normalized)) {
    return "technologies";
  }
  if (/(?:csrf|session|token|oauth|login|password|auth|cookie|recovery)/.test(normalized)) {
    return "auth";
  }
  if (/(?:email|invoice|case|backup|artifact|pdf|csv|json|xml|\.bak|\.zip|\.db|directory listing|file)/.test(normalized)) {
    return "artifacts";
  }
  if (/(?:redirect|403|401|500|stack trace|leak|exposed|error|forbidden|unauthorized|warning)/.test(normalized)) {
    return "anomalies";
  }
  return "general";
}

function maybeQualifyRouteObservation(summary: string, group: FirstScanObservation["group"]) {
  if (group !== "routes") {
    return summary;
  }
  const normalized = summary.toLowerCase();
  if (
    normalized.includes("200")
    && !/(redirect|listing|leak|exposed|unauth|forbidden|admin panel|directory listing|sensitive)/.test(normalized)
  ) {
    return `${summary} Route presence observed; sensitive exposure is not yet confirmed.`;
  }
  return summary;
}

function stripAnsi(value: string) {
  return value.replace(ANSI_ESCAPE_PATTERN, "");
}

function normalizeSummary(value: string) {
  return stripAnsi(value).replace(/\s+/g, " ").trim();
}

function extractHttpStatus(summary: string) {
  const match = summary.match(/\bHTTP\s+(\d{3})\b|\bstatus\s+(\d{3})\b|\breturned\s+HTTP\s+(\d{3})\b/i);
  const raw = match?.[1] ?? match?.[2] ?? match?.[3];
  return raw ? Number(raw) : null;
}

function extractEvidenceSignals(summary: string) {
  const normalized = summary.toLowerCase();
  return {
    hasArtifacts: /(exposed artifacts|email=|caseRef=|buildId=|token=|approvalToken=|sessionToken=)/i.test(summary),
    hasLinks: /\band linked to\b/i.test(summary),
    is404: extractHttpStatus(summary) === 404,
    is5xx: (() => {
      const status = extractHttpStatus(summary);
      return status !== null && status >= 500;
    })(),
    isGenericRoutePresence: normalized.includes("route presence observed"),
    hasConcreteExposure: /(redirect|listing|exposed|leak|forbidden|unauthorized|500|email=|caseRef=|buildId=)/i.test(summary)
  };
}

function extractOpenPortLines(value: string) {
  return stripAnsi(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\/(?:tcp|udp)\s+open\b/i.test(line));
}

function buildNmapSummary(result: ExecutedToolResult, fallbackSummary: string) {
  const portLines = extractOpenPortLines(result.fullOutput);
  if (portLines.length === 0) {
    return normalizeSummary(fallbackSummary);
  }
  const compactPorts = portLines
    .slice(0, 3)
    .map((line) => line.replace(/\s+/g, " "))
    .join("; ");
  return `Nmap identified ${compactPorts}.`;
}

function scoreObservationRank(summary: string, confidence: number, group: FirstScanObservation["group"]) {
  const normalized = summary.toLowerCase();
  const signals = extractEvidenceSignals(summary);
  const groupWeight: Record<FirstScanObservation["group"], number> = {
    "routes": 18,
    "services": 16,
    "technologies": 12,
    "artifacts": 14,
    "auth": 15,
    "anomalies": 17,
    "general": 8
  };
  let score = Math.round(confidence * 100) + groupWeight[group];
  if (/(admin|login|api|users|files|vendors|support|recover|finance|robots\.txt|security\.txt)/.test(normalized)) {
    score += 8;
  }
  if (/(redirect|listing|exposed|leak|reachable|open)/.test(normalized)) {
    score += 6;
  }
  if (signals.hasArtifacts) {
    score += 18;
  }
  if (signals.hasLinks) {
    score += 6;
  }
  if (signals.is5xx) {
    score += 8;
  }
  if (signals.isGenericRoutePresence && !signals.hasConcreteExposure) {
    score -= 8;
  }
  if (signals.is404) {
    score -= 28;
  }
  return score;
}

function buildExcerpt(result: ExecutedToolResult, summary: string) {
  const raw = stripAnsi(result.fullOutput.trim() || result.outputPreview.trim());
  const normalizedSummary = normalizeSummary(summary);
  if (!raw) {
    return normalizedSummary;
  }

  if (result.toolName.toLowerCase().includes("nmap")) {
    const portLines = extractOpenPortLines(raw).slice(0, 3);
    if (portLines.length > 0) {
      const excerpt = portLines.map((line) => line.replace(/\s+/g, " ")).join("; ");
      return excerpt.length > 180 ? `${excerpt.slice(0, 177)}...` : excerpt;
    }
  }

  if (normalizedSummary.length > 0) {
    return normalizedSummary.length > 180 ? `${normalizedSummary.slice(0, 177)}...` : normalizedSummary;
  }

  const candidateLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^starting nmap/i.test(line) && !/^nmap scan report/i.test(line) && !/^host is up/i.test(line));
  const preferred = candidateLines.find((line) =>
    /(admin|login|api|users|files|vendors|support|recover|robots\.txt|security\.txt|open|server:|x-powered-by|http\/)/i.test(line)
  ) ?? candidateLines[0] ?? normalizedSummary;
  return preferred.length > 180 ? `${preferred.slice(0, 177)}...` : preferred;
}

function collectObservations(results: ExecutedToolResult[]) {
  const deduped = new Map<string, FirstScanObservation>();

  for (const result of results) {
    const observations = result.publicObservations.length > 0
      ? result.publicObservations.map((observation) => ({
          summary: observation.summary,
          confidence: typeof observation.confidence === "number" ? observation.confidence : 0.5
        }))
      : [{
          summary: result.outputPreview,
          confidence: 0.5
        }];

    const strongestToolObservation = observations
      .filter((observation) => !extractEvidenceSignals(observation.summary).is404)
      .sort((left, right) => {
        const leftScore = scoreObservationRank(normalizeSummary(left.summary), typeof left.confidence === "number" ? left.confidence : 0.5, classifyObservationGroup(left.summary));
        const rightScore = scoreObservationRank(normalizeSummary(right.summary), typeof right.confidence === "number" ? right.confidence : 0.5, classifyObservationGroup(right.summary));
        return rightScore - leftScore;
      })[0] ?? observations[0];

    for (const observation of observations) {
      const normalizedSummary = normalizeSummary(observation.summary);
      const normalizedOutputPreview = normalizeSummary(result.outputPreview);
      const group = classifyObservationGroup(`${normalizedSummary}\n${normalizedOutputPreview}`);
      const summaryBase = result.toolName.toLowerCase().includes("nmap")
        ? buildNmapSummary(result, normalizedSummary)
        : normalizedSummary;
      const summary = maybeQualifyRouteObservation(summaryBase, group);
      const entry: FirstScanObservation = {
        summary,
        sourceToolName: result.toolName,
        ref: result.toolRun.id,
        confidence: observation.confidence,
        group,
        rank: scoreObservationRank(summary, observation.confidence, group),
        excerpt: observation === strongestToolObservation
          ? buildExcerpt(result, summary)
          : buildExcerpt(result, normalizeSummary(strongestToolObservation?.summary ?? summary))
      };
      const key = `${group}:${summary.toLowerCase()}`;
      const existing = deduped.get(key);
      if (!existing || entry.rank > existing.rank) {
        deduped.set(key, entry);
      }
    }
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.rank !== right.rank) {
      return right.rank - left.rank;
    }
    return left.summary.localeCompare(right.summary);
  });
}

export function buildFirstApplicationScanSummary(
  target: StageExecutionTarget,
  results: ExecutedToolResult[]
): FirstApplicationScanSummary {
  const observations = collectObservations(results);
  const keyFindings = observations.slice(0, 5);
  const grouped = new Map<FirstScanObservation["group"], FirstScanObservation[]>();
  for (const observation of observations) {
    const entries = grouped.get(observation.group) ?? [];
    entries.push(observation);
    grouped.set(observation.group, entries);
  }

  const excerptCandidates = [...new Map(
    observations
      .filter((observation) => !extractEvidenceSignals(observation.summary).is404)
      .slice(0, 4)
      .map((observation) => [`${observation.sourceToolName}:${observation.excerpt}`, observation] as const)
  ).values()];

  const lines = [
    "Scan preamble:",
    "Use this starting picture as prior context before taking any additional tool actions.",
    "",
    "Target summary:",
    `- Base URL: ${target.baseUrl}`,
    `- Successful scan tools: ${results.length}`,
    `- Ranked findings: ${keyFindings.length}`,
    `- Distinct observations: ${observations.length}`
  ];

  if (keyFindings.length > 0) {
    lines.push("", "Key findings:");
    for (const [index, finding] of keyFindings.entries()) {
      lines.push(`${index + 1}. ${finding.summary}`);
      lines.push(`   Confidence: ${finding.confidence.toFixed(2)}. Source: ${finding.sourceToolName}. Ref: ${finding.ref}.`);
    }
  }

  const groupTitles: Array<[FirstScanObservation["group"], string]> = [
    ["routes", "Routes and content"],
    ["services", "Services and protocols"],
    ["technologies", "Technologies and stack clues"],
    ["artifacts", "Artifacts and exposed data"],
    ["auth", "Auth and session clues"],
    ["anomalies", "Notable response anomalies"],
    ["general", "Additional observations"]
  ];

  for (const [group, title] of groupTitles) {
    const entries = grouped.get(group);
    if (!entries || entries.length === 0) {
      continue;
    }
    lines.push("", `${title}:`);
    for (const entry of entries) {
      lines.push(`- ${entry.summary} (confidence ${entry.confidence.toFixed(2)}; source ${entry.sourceToolName}; ref ${entry.ref})`);
    }
  }

  if (excerptCandidates.length > 0) {
    lines.push("", "Supporting excerpts:");
    for (const entry of excerptCandidates) {
      lines.push(`- ${entry.sourceToolName} (${entry.ref}): ${entry.excerpt}`);
    }
  }

  return {
    promptSection: lines.join("\n"),
    groupedObservationCount: observations.length,
    keyFindingCount: keyFindings.length,
    excerptCount: excerptCandidates.length
  };
}
