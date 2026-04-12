import type { Report, ScanLlmConfig, VulnerabilityChain, WsEvent } from "@synosec/contracts";
import { getAttackPaths, getFindingsForScan, getGraphForScan, getScan } from "../db/neo4j.js";

// ---------------------------------------------------------------------------
// Report generation via Claude
// ---------------------------------------------------------------------------

interface ReportClaudeResponse {
  executiveSummary: string;
  topRisks: Array<{
    title: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    nodeTarget: string;
    recommendation: string;
  }>;
}

function buildFallbackExecutiveSummary(
  findingsCount: number,
  findingsBySeverity: Report["findingsBySeverity"],
  scopeTargets: string[]
): string {
  const severityLevels = Object.entries(findingsBySeverity)
    .filter(([, count]) => count > 0)
    .map(([severity]) => severity)
    .join(", ");

  const highestSeverity = findingsBySeverity.critical > 0
    ? "critical"
    : findingsBySeverity.high > 0
      ? "high"
      : findingsBySeverity.medium > 0
        ? "medium"
        : findingsBySeverity.low > 0
          ? "low"
          : "informational";

  return [
    `Security assessment of ${scopeTargets.join(", ")} produced ${findingsCount} findings across ${severityLevels || "no"} severity tiers.`,
    `The highest observed severity was ${highestSeverity}.`,
    findingsBySeverity.high > 0 || findingsBySeverity.critical > 0
      ? "Immediate remediation should focus on externally exposed high-risk services and directly reachable administrative surfaces."
      : "The current results are dominated by exposure and hardening issues rather than immediately critical compromise paths."
  ].join(" ");
}

function buildFallbackTopRisks(
  findings: Awaited<ReturnType<typeof getFindingsForScan>>,
  nodeTargetById: Map<string, string>
): ReportClaudeResponse["topRisks"] {
  return findings
    .filter((f) => f.severity !== "info")
    .sort((a, b) => {
      const severityRank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return severityRank[b.severity] - severityRank[a.severity];
    })
    .slice(0, 5)
    .map((finding) => ({
      title: finding.title,
      severity: finding.severity,
      nodeTarget: nodeTargetById.get(finding.nodeId) ?? finding.nodeId,
      recommendation: `Validate and remediate ${finding.title.toLowerCase()} on ${nodeTargetById.get(finding.nodeId) ?? finding.nodeId}. Start with the service exposed by ${finding.technique.toLowerCase()} and harden configuration before the next scan.`
    }));
}

function buildDeterministicReportData(
  findings: Awaited<ReturnType<typeof getFindingsForScan>>,
  findingsBySeverity: Report["findingsBySeverity"],
  scopeTargets: string[],
  nodeTargetById: Map<string, string>
): ReportClaudeResponse {
  return {
    executiveSummary: buildFallbackExecutiveSummary(findings.length, findingsBySeverity, scopeTargets),
    topRisks: buildFallbackTopRisks(findings, nodeTargetById)
  };
}

export async function generateReport(
  scanId: string,
  broadcast: (event: WsEvent) => void,
  llmConfig?: ScanLlmConfig,
  attackChains: VulnerabilityChain[] = []
): Promise<Report> {
  const [findings, attackPaths, scan, graph] = await Promise.all([
    getFindingsForScan(scanId),
    getAttackPaths(scanId),
    getScan(scanId),
    getGraphForScan(scanId)
  ]);

  const findingsBySeverity = {
    info: findings.filter((f) => f.severity === "info").length,
    low: findings.filter((f) => f.severity === "low").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    high: findings.filter((f) => f.severity === "high").length,
    critical: findings.filter((f) => f.severity === "critical").length
  };

  const nodeTargetById = new Map(graph.nodes.map((node) => [node.id, node.target]));
  const scopeTargets = scan?.scope.targets ?? ["unknown target"];
  void llmConfig;
  const claudeResult = buildDeterministicReportData(findings, findingsBySeverity, scopeTargets, nodeTargetById);

  const report: Report = {
    scanId,
    executiveSummary: claudeResult.executiveSummary,
    totalFindings: findings.length,
    findingsBySeverity,
    topRisks: claudeResult.topRisks.slice(0, 5),
    attackPaths,
    attackChains,
    generatedAt: new Date().toISOString()
  };

  broadcast({ type: "report_ready", report });

  return report;
}
