import { randomUUID } from "crypto";
import type { GraceReport, VulnerabilityChain } from "@synosec/contracts";
import {
  createVulnerabilityChain,
  detectVulnerabilityChains,
  findOrphanedHighRiskFindings,
  getAttackSurfaceClusters,
  linkFindingsInChain
} from "../db/neo4j.js";

// ---------------------------------------------------------------------------
// GRACE Reasoner
// Runs graph-reasoning queries between orchestrator rounds to detect
// vulnerability chains, lateral movement paths, and false positives.
// ---------------------------------------------------------------------------

const GRACE_QUERY_TIMEOUT_MS = 5000;

export class GraceReasoner {
  /**
   * Run a full GRACE analysis for a scan.
   * Times out gracefully — a slow Neo4j query will not stall the orchestrator.
   */
  async runGraceAnalysis(scanId: string): Promise<GraceReport> {
    const timer = setTimeout(() => {}, GRACE_QUERY_TIMEOUT_MS);

    try {
      const [chainDetections, clusters, orphanedIds] = await Promise.all([
        withTimeout(detectVulnerabilityChains(scanId), GRACE_QUERY_TIMEOUT_MS, []),
        withTimeout(getAttackSurfaceClusters(scanId), GRACE_QUERY_TIMEOUT_MS, []),
        withTimeout(findOrphanedHighRiskFindings(scanId), GRACE_QUERY_TIMEOUT_MS, [])
      ]);

      // Convert raw chain detections into VulnerabilityChain objects and persist them
      const detectedChains: VulnerabilityChain[] = [];

      for (const detection of chainDetections) {
        const chain: VulnerabilityChain = {
          id: randomUUID(),
          scanId,
          title: `${detection.trigger} → ${detection.impact}`,
          compositeRisk: detection.chainConfidence,
          technique: this.inferTechnique(detection.trigger, detection.impact),
          findingIds: [],
          links: [],
          startTarget: detection.startTarget,
          endTarget: detection.endTarget,
          chainLength: detection.startTarget === detection.endTarget ? 1 : 2,
          confidence: detection.chainConfidence,
          narrative: this.buildNarrative(detection),
          createdAt: new Date().toISOString()
        };

        await createVulnerabilityChain(chain);
        detectedChains.push(chain);
      }

      // Prioritized targets: top 3 by risk weight from clustering
      const prioritizedTargets = clusters.slice(0, 3).map((c) => c.target);

      return {
        scanId,
        detectedChains,
        chainDetections,
        prioritizedTargets,
        orphanedHighRiskFindingIds: orphanedIds,
        generatedAt: new Date().toISOString()
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Link actual Finding nodes into a VulnerabilityChain by finding IDs.
   * Called by the orchestrator after findings are stored in Neo4j.
   */
  async linkFindingsToChain(chainId: string, findingIds: string[]): Promise<void> {
    if (findingIds.length === 0) return;
    await linkFindingsInChain(chainId, findingIds);
  }

  private inferTechnique(trigger: string, impact: string): string {
    const combined = `${trigger} ${impact}`.toLowerCase();

    if (combined.includes("sql") || combined.includes("inject")) return "T1190 - Exploit Public-Facing Application";
    if (combined.includes("ssl") || combined.includes("tls") || combined.includes("cert")) return "T1557 - Adversary-in-the-Middle";
    if (combined.includes("ssh") || combined.includes("smb") || combined.includes("session")) return "T1021 - Remote Services";
    if (combined.includes("xss") || combined.includes("script")) return "T1059 - Command and Scripting Interpreter";
    if (combined.includes("port") || combined.includes("scan") || combined.includes("open")) return "T1046 - Network Service Discovery";
    if (combined.includes("auth") || combined.includes("credential") || combined.includes("password")) return "T1110 - Brute Force";

    return "T1595 - Active Scanning";
  }

  private buildNarrative(detection: {
    startTarget: string;
    trigger: string;
    endTarget: string;
    impact: string;
    chainConfidence: number;
  }): string {
    const conf = (detection.chainConfidence * 100).toFixed(0);
    if (detection.startTarget === detection.endTarget) {
      return `On ${detection.startTarget}, the vulnerability "${detection.trigger}" can be chained with "${detection.impact}" to escalate impact (confidence: ${conf}%).`;
    }
    return `Starting with "${detection.trigger}" on ${detection.startTarget}, an attacker can pivot to ${detection.endTarget} and achieve "${detection.impact}" (confidence: ${conf}%).`;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}
