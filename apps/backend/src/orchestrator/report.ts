import type { Report, ScanLlmConfig, VulnerabilityChain, WsEvent } from "@synosec/contracts";
import { getAttackPaths, getFindingsForScan, getScan } from "../db/neo4j.js";
import { createLlmClient } from "../llm/client.js";

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

export async function generateReport(
  scanId: string,
  broadcast: (event: WsEvent) => void,
  llmConfig?: ScanLlmConfig,
  attackChains: VulnerabilityChain[] = []
): Promise<Report> {
  const [findings, attackPaths, scan] = await Promise.all([
    getFindingsForScan(scanId),
    getAttackPaths(scanId),
    getScan(scanId)
  ]);

  const findingsBySeverity = {
    info: findings.filter((f) => f.severity === "info").length,
    low: findings.filter((f) => f.severity === "low").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    high: findings.filter((f) => f.severity === "high").length,
    critical: findings.filter((f) => f.severity === "critical").length
  };

  const llmClient = createLlmClient(llmConfig);

  const findingsSummary = findings
    .map(
      (f) =>
        `[${f.severity.toUpperCase()}] ${f.title} — Target: ${f.nodeId}, Technique: ${f.technique}, Validation: ${f.validationStatus ?? "unverified"}\nDescription: ${f.description}`
    )
    .join("\n\n");

  const attackPathsSummary = attackPaths.length > 0
    ? attackPaths.map((ap) => `- ${ap.description} (risk: ${ap.risk})`).join("\n")
    : "No high-severity attack paths identified.";

  const chainsSummary = attackChains.length > 0
    ? "\n\nGRACE VULNERABILITY CHAINS:\n" +
      attackChains
        .slice(0, 5)
        .map((c) => `- [${(c.compositeRisk * 100).toFixed(0)}% risk] ${c.title}\n  ${c.narrative ?? `${c.startTarget} → ${c.endTarget}`}`)
        .join("\n")
    : "";

  const systemPrompt = `You are a senior penetration testing report writer. You produce clear, professional security reports that executives and engineers can act on.
Respond ONLY with valid JSON, no markdown code blocks, no explanation.`;

  const userPrompt = `Generate a penetration test report for scan ${scanId}.

TARGET SCOPE: ${scan ? JSON.stringify(scan.scope.targets) : "Unknown"}

FINDINGS SUMMARY:
Total: ${findings.length}
Critical: ${findingsBySeverity.critical}, High: ${findingsBySeverity.high}, Medium: ${findingsBySeverity.medium}, Low: ${findingsBySeverity.low}, Info: ${findingsBySeverity.info}

DETAILED FINDINGS:
${findingsSummary || "No findings recorded."}

ATTACK PATHS:
${attackPathsSummary}${chainsSummary}

Return ONLY this JSON:
{
  "executiveSummary": "2-3 paragraph executive summary describing the overall security posture, key risks found, and urgency",
  "topRisks": [
    {
      "title": "string",
      "severity": "info|low|medium|high|critical",
      "nodeTarget": "ip or hostname",
      "recommendation": "specific actionable recommendation"
    }
  ]
}

Include top 5 risks ordered by severity. Recommendations must be specific and actionable.`;

  let claudeResult: ReportClaudeResponse;

  try {
    const text = await llmClient.generateText({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 3000
    });
    claudeResult = JSON.parse(text) as ReportClaudeResponse;
  } catch (err: unknown) {
    console.error("Report generation LLM error:", err instanceof Error ? err.message : err);
    claudeResult = {
      executiveSummary: `Security assessment of the target environment revealed ${findings.length} findings across ${Object.keys(findingsBySeverity).filter((k) => findingsBySeverity[k as keyof typeof findingsBySeverity] > 0).length} severity levels. ${findingsBySeverity.critical > 0 ? `Critical vulnerabilities were identified that require immediate remediation.` : "No critical vulnerabilities were found."} The overall security posture requires attention, particularly around web application security and network service exposure. Immediate action is recommended for high and critical findings.`,
      topRisks: findings
        .filter((f) => f.severity === "critical" || f.severity === "high")
        .slice(0, 5)
        .map((f) => ({
          title: f.title,
          severity: f.severity,
          nodeTarget: f.nodeId,
          recommendation: `Remediate ${f.title} immediately. Review ${f.technique} controls and implement defense in depth.`
        }))
    };
  }

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
