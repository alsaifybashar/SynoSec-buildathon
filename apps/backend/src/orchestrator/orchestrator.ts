import { randomUUID } from "crypto";
import type {
  DfsNode,
  Finding,
  GraceAgentContext,
  GraceReport,
  Scan,
  ScanLlmConfig,
  ValidationStatus,
  WsEvent
} from "@synosec/contracts";
import {
  boostNodeRiskScore,
  createAuditEntry,
  createFinding,
  getFindingsForScan,
  getVulnerabilityChains,
  updateNodeStatus,
  updateScanStatus
} from "../db/neo4j.js";
import { L3Agent } from "../agents/l3-agent.js";
import { L4Agent } from "../agents/l4-agent.js";
import { L5Agent } from "../agents/l5-agent.js";
import { L6Agent } from "../agents/l6-agent.js";
import { L7Agent } from "../agents/l7-agent.js";
import { ToolBroker } from "../broker/tool-broker.js";
import { confidenceEngine } from "../broker/confidence-engine.js";
import { evidenceStore } from "../broker/evidence-store.js";
import { DfsQueue } from "./dfs-graph.js";
import { GraceReasoner } from "./grace-reasoner.js";
import { generateReport } from "./report.js";
import { reportStore } from "../runtime/report-store.js";
import { createLlmClient, type LlmClient } from "../llm/client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SupportedLayer = "L3" | "L4" | "L5" | "L6" | "L7";

const abortSignals = new Map<string, boolean>();

export class Orchestrator {
  private queue = new DfsQueue();
  private llmClient: LlmClient;
  private broker: ToolBroker;
  private graceReasoner = new GraceReasoner();
  private currentGraceContext: GraceAgentContext | undefined;

  constructor(
    private broadcast: (event: WsEvent) => void,
    private readonly llmConfig?: ScanLlmConfig
  ) {
    this.llmClient = createLlmClient(llmConfig);
    this.broker = new ToolBroker({ broadcast });
  }

  async run(scan: Scan): Promise<void> {
    const maxDepth = Number(process.env["SCAN_MAX_DEPTH"] ?? scan.scope.maxDepth ?? 3);
    abortSignals.set(scan.id, false);

    await updateScanStatus(scan.id, "running");
    const runningState: Scan = { ...scan, status: "running" };
    this.broadcast({ type: "scan_status", scan: runningState });

    let nodesTotal = 0;
    const rootNodes: DfsNode[] = [];

    for (const target of scan.scope.targets) {
      const rootNode: DfsNode = {
        id: randomUUID(),
        scanId: scan.id,
        target,
        layer: "L3",
        riskScore: 0.5,
        status: "pending",
        parentId: null,
        depth: 0,
        createdAt: new Date().toISOString()
      };
      await this.queue.enqueue(rootNode);
      nodesTotal++;
      rootNodes.push(rootNode);
    }

    await updateScanStatus(scan.id, "running", { nodesTotal });

    await createAuditEntry({
      id: randomUUID(),
      scanId: scan.id,
      timestamp: new Date().toISOString(),
      actor: "orchestrator",
      action: "scan-started",
      scopeValid: true,
      details: {
        targets: scan.scope.targets,
        maxDepth,
        rootNodesCreated: rootNodes.length,
        llmProvider: this.llmClient.provider,
        llmModel: this.llmClient.model
      }
    });

    let nodesComplete = 0;
    let currentRound = 0;
    let roundSummary = "";
    let completedCountForRound = 0;

    const maxDurationMs =
      (Number(process.env["SCAN_MAX_DURATION_MINUTES"] ?? scan.scope.maxDurationMinutes ?? 10)) *
      60 *
      1000;
    const deadline = Date.now() + maxDurationMs;

    while (Date.now() < deadline) {
      if (abortSignals.get(scan.id) === true) {
        await updateScanStatus(scan.id, "aborted", {
          completedAt: new Date().toISOString(),
          nodesComplete
        });
        this.broadcast({
          type: "scan_status",
          scan: {
            ...scan,
            status: "aborted",
            nodesComplete,
            nodesTotal,
            currentRound,
            completedAt: new Date().toISOString()
          }
        });
        abortSignals.delete(scan.id);
        return;
      }

      const node = await this.queue.dequeue(scan.id, maxDepth);
      if (!node) break;

      if (abortSignals.get(scan.id) === true) {
        await updateScanStatus(scan.id, "aborted", {
          completedAt: new Date().toISOString(),
          nodesComplete
        });
        abortSignals.delete(scan.id);
        return;
      }

      await updateNodeStatus(node.id, "in-progress");
      const inProgressNode: DfsNode = { ...node, status: "in-progress" };
      this.broadcast({ type: "node_updated", node: inProgressNode });

      const inScope = this.isInScope(node.target, scan);
      if (!inScope) {
        await updateNodeStatus(node.id, "skipped");
        this.broadcast({ type: "node_updated", node: { ...node, status: "skipped" } });

        await createAuditEntry({
          id: randomUUID(),
          scanId: scan.id,
          timestamp: new Date().toISOString(),
          actor: "orchestrator",
          action: "node-skipped-out-of-scope",
          targetNodeId: node.id,
          scopeValid: false,
          details: { target: node.target, reason: "Target not in scope" }
        });
        continue;
      }

      try {
        const agent = this.getAgent(node.layer as SupportedLayer);
        if (!agent) {
          await updateNodeStatus(node.id, "skipped");
          this.broadcast({ type: "node_updated", node: { ...node, status: "skipped" } });
          continue;
        }

        const allFindings = await getFindingsForScan(scan.id);
        const parentFindings = allFindings.filter((finding) => finding.nodeId === node.parentId);

        const agentContext = {
          scanId: scan.id,
          scope: scan.scope,
          parentFindings,
          roundSummary,
          ...(this.currentGraceContext ? { graceContext: this.currentGraceContext } : {})
        };
        const result = await agent.execute(node, agentContext);

        const brokerResult = await this.broker.executeRequests({
          scan,
          nodeId: node.id,
          agentId: agent.agentId,
          requests: result.requestedToolRuns
        });

        for (const rawFinding of brokerResult.findings) {
          let finding: Finding = {
            ...rawFinding,
            id: randomUUID(),
            createdAt: new Date().toISOString()
          };
          await createFinding(finding);
          this.broadcast({ type: "finding_added", finding });

          // Propagate confidence through the engine — may upgrade validationStatus
          finding = await confidenceEngine.propagateToFinding(finding, scan.id);
          if (finding.validationStatus) {
            this.broadcast({
              type: "finding_validated",
              findingId: finding.id,
              validationStatus: finding.validationStatus,
              reason: finding.confidenceReason ?? "Validation derived from tool evidence."
            });
          }
        }

        const highRiskFindings = brokerResult.findings.filter(
          (finding) => finding.severity === "critical" || finding.severity === "high"
        );
        if (highRiskFindings.length > 0) {
          await this.crossValidate(scan, node, highRiskFindings);
        }

        for (const rawChild of result.childNodes) {
          const child: DfsNode = {
            ...rawChild,
            id: randomUUID(),
            scanId: scan.id,
            parentId: node.id,
            createdAt: new Date().toISOString()
          };
          await this.queue.enqueue(child);
          nodesTotal++;
        }

        await updateScanStatus(scan.id, "running", { nodesTotal });
      } catch (err: unknown) {
        console.error(`Agent error for node ${node.id}:`, err instanceof Error ? err.message : err);

        await createAuditEntry({
          id: randomUUID(),
          scanId: scan.id,
          timestamp: new Date().toISOString(),
          actor: "orchestrator",
          action: "agent-error",
          targetNodeId: node.id,
          scopeValid: true,
          details: { error: err instanceof Error ? err.message : String(err) }
        });
      }

      await updateNodeStatus(node.id, "complete");
      this.broadcast({ type: "node_updated", node: { ...node, status: "complete" } });
      nodesComplete++;
      completedCountForRound++;

      await updateScanStatus(scan.id, "running", { nodesComplete, nodesTotal });

      const graceRoundInterval = scan.scope.graceRoundInterval ?? 3;
      if (completedCountForRound >= graceRoundInterval) {
        completedCountForRound = 0;
        currentRound++;

        // Run GRACE analysis if enabled
        let graceReport: GraceReport | undefined;
        if (scan.scope.graceEnabled !== false) {
          try {
            graceReport = await this.graceReasoner.runGraceAnalysis(scan.id);
            await this.applyGraceFeedback(scan.id, graceReport);
            this.broadcast({
              type: "grace_analysis_complete",
              round: currentRound,
              chainsFound: graceReport.detectedChains.length,
              prioritizedTargets: graceReport.prioritizedTargets
            });
          } catch (err: unknown) {
            console.error("GRACE analysis error:", err instanceof Error ? err.message : err);
          }
        }

        roundSummary = await this.orchestratorAnalysis(scan.id, currentRound, graceReport);
        this.broadcast({ type: "round_complete", round: currentRound, summary: roundSummary });

        await updateScanStatus(scan.id, "running", { currentRound });

        await createAuditEntry({
          id: randomUUID(),
          scanId: scan.id,
          timestamp: new Date().toISOString(),
          actor: "orchestrator",
          action: "round-complete",
          scopeValid: true,
          details: {
            round: currentRound,
            summary: roundSummary,
            chainsDetected: graceReport?.detectedChains.length ?? 0,
            prioritizedTargets: graceReport?.prioritizedTargets ?? []
          }
        });
      }
    }

    const completedAt = new Date().toISOString();
    await updateScanStatus(scan.id, "complete", { completedAt, nodesComplete, nodesTotal });
    confidenceEngine.clearScan(scan.id);

    this.broadcast({
      type: "scan_status",
      scan: {
        ...scan,
        status: "complete",
        nodesComplete,
        nodesTotal,
        currentRound,
        completedAt
      }
    });

    try {
      const chains = await getVulnerabilityChains(scan.id);
      const report = await generateReport(scan.id, this.broadcast, this.llmConfig, chains);
      reportStore.set(scan.id, report);
    } catch (err: unknown) {
      console.error("Report generation error:", err instanceof Error ? err.message : err);
    }

    abortSignals.delete(scan.id);
  }

  async abort(scanId: string): Promise<void> {
    abortSignals.set(scanId, true);
  }

  private getAgent(layer: SupportedLayer) {
    switch (layer) {
      case "L3":
        return new L3Agent(this.llmClient);
      case "L4":
        return new L4Agent(this.llmClient);
      case "L5":
        return new L5Agent(this.llmClient);
      case "L6":
        return new L6Agent(this.llmClient);
      case "L7":
        return new L7Agent(this.llmClient);
      default:
        return null;
    }
  }

  private async crossValidate(
    scan: Scan,
    node: DfsNode,
    highRiskFindings: Array<Omit<Finding, "id" | "createdAt">>
  ): Promise<void> {
    try {
      const evidence = evidenceStore.getObservationsForNode(scan.id, node.id);
      const evidenceSummary = evidence
        .map((observation) => `- ${observation.title}: ${observation.summary}`)
        .join("\n");
      const findingsSummary = highRiskFindings
        .map((finding) => `[${finding.severity.toUpperCase()}] ${finding.title}: ${finding.description}`)
        .join("\n");

      const validations: Array<{ title: string; validationStatus: ValidationStatus; reason: string }> =
        evidence.length >= 2
          ? highRiskFindings.map((finding) => ({
              title: finding.title,
              validationStatus:
                finding.validationStatus === "cross_validated" ? "cross_validated" : "single_source",
              reason:
                finding.validationStatus === "cross_validated"
                  ? "Multiple corroborating observations support this finding."
                  : "High-risk signal exists, but only a single evidence path is available."
            }))
          : [];

      if (validations.length === 0) {
        const response = await this.llmClient.generateText({
          maxTokens: 1024,
          system:
            "You review pentest evidence. Only confirm findings when the supplied tool evidence supports them. Respond ONLY with valid JSON array.",
          user: `Target ${node.target} (${node.layer}) high-risk findings:\n${findingsSummary}\n\nEvidence:\n${evidenceSummary || "No evidence"}\n\nReturn JSON array with { "title": string, "validationStatus": "single_source|cross_validated|rejected", "reason": string }.`
        });

        const parsed = JSON.parse(response) as Array<{
          title: string;
          validationStatus: ValidationStatus;
          reason: string;
        }>;
        validations.push(...parsed);
      }

      await createAuditEntry({
        id: randomUUID(),
        scanId: scan.id,
        timestamp: new Date().toISOString(),
        actor: "orchestrator-validator",
        action: "cross-validation-complete",
        targetNodeId: node.id,
        scopeValid: true,
        details: { validations, findingsReviewed: highRiskFindings.length }
      });
    } catch (err: unknown) {
      console.error("Cross-validation error:", err instanceof Error ? err.message : err);
    }
  }

  private isInScope(target: string, scan: Scan): boolean {
    const { targets, exclusions } = scan.scope;
    const stripPort = (value: string) => value.replace(/:\d+$/, "");
    const targetHost = stripPort(target);

    for (const exclusion of exclusions) {
      const exclusionHost = stripPort(exclusion);
      if (targetHost === exclusionHost || targetHost.startsWith(exclusionHost)) return false;
    }

    for (const scopeTarget of targets) {
      const scopeHost = stripPort(scopeTarget);
      if (target === scopeTarget || targetHost === scopeHost) return true;
      if (target.startsWith(scopeTarget) || targetHost.startsWith(scopeHost)) return true;
      if (scopeTarget.startsWith(target) || scopeHost.startsWith(targetHost)) return true;
    }

    return false;
  }

  private async applyGraceFeedback(scanId: string, report: GraceReport): Promise<void> {
    // Broadcast each newly detected chain
    for (const chain of report.detectedChains) {
      this.broadcast({ type: "chain_detected", chain });
    }

    // Boost riskScore for nodes on prioritized targets
    for (const target of report.prioritizedTargets) {
      const layers = ["L3", "L4", "L5", "L6", "L7"] as const;
      for (const layer of layers) {
        await boostNodeRiskScore(scanId, target, layer, 0.15);
      }
    }

    // Update the shared GRACE context used by all agents in the next round
    const chains = await getVulnerabilityChains(scanId);
    this.currentGraceContext = {
      detectedChains: chains,
      prioritizedTargets: report.prioritizedTargets,
      knownOpenPorts: {},
      confirmedServices: {}
    };
  }

  private async orchestratorAnalysis(
    scanId: string,
    round: number,
    graceReport?: GraceReport
  ): Promise<string> {
    try {
      const findings = await getFindingsForScan(scanId);
      const observations = evidenceStore.getObservationsForScan(scanId);

      const findingSummary = findings
        .slice(-20)
        .map((finding) => `[${finding.severity}] ${finding.title} (${finding.validationStatus ?? "unverified"})`)
        .join("\n");
      const observationSummary = observations
        .slice(-10)
        .map((observation) => `- ${observation.title} via ${observation.adapter}`)
        .join("\n");

      const graceSummary = graceReport && graceReport.detectedChains.length > 0
        ? `\n\nGRACE CHAINS DETECTED (${graceReport.detectedChains.length}):\n` +
          graceReport.detectedChains
            .slice(0, 3)
            .map((c) => `- ${c.title} (confidence: ${(c.confidence * 100).toFixed(0)}%, targets: ${c.startTarget} → ${c.endTarget})`)
            .join("\n") +
          `\n\nPRIORITIZED TARGETS: ${graceReport.prioritizedTargets.join(", ")}`
        : "";

      if (!process.env["ANTHROPIC_API_KEY"]) {
        const chainNote = graceReport?.detectedChains.length
          ? ` GRACE detected ${graceReport.detectedChains.length} vulnerability chain(s).`
          : "";
        return `Round ${round} complete.${chainNote} Prioritizing nodes with corroborated evidence and elevated severity.`;
      }

      return await this.llmClient.generateText({
        maxTokens: 512,
        system:
          "You are an AI pentest orchestrator. Prioritize next steps based on evidence-backed findings and GRACE chain analysis.",
        user: `Round ${round} evidence summary:\n${observationSummary || "No observations"}\n\nFindings:\n${findingSummary || "No findings yet."}${graceSummary}\n\nExplain the highest-priority next step in 2-3 sentences.`
      });
    } catch (err: unknown) {
      console.error("Orchestrator analysis error:", err instanceof Error ? err.message : err);
      return `Round ${round} complete. Continuing scan with highest-risk nodes prioritized.`;
    }
  }
}

export { abortSignals };
