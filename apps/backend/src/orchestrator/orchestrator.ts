import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import type { DfsNode, Finding, Scan, WsEvent } from "@synosec/contracts";
import {
  createAuditEntry,
  createFinding,
  getFindingsForScan,
  updateNodeStatus,
  updateScanStatus
} from "../db/neo4j.js";
import { L3Agent } from "../agents/l3-agent.js";
import { L4Agent } from "../agents/l4-agent.js";
import { L5Agent } from "../agents/l5-agent.js";
import { L6Agent } from "../agents/l6-agent.js";
import { L7Agent } from "../agents/l7-agent.js";
import { DfsQueue } from "./dfs-graph.js";
import { generateReport } from "./report.js";
import { reportStore } from "../seed/demo-data.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SupportedLayer = "L3" | "L4" | "L5" | "L6" | "L7";

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

const abortSignals = new Map<string, boolean>();

export class Orchestrator {
  private queue = new DfsQueue();
  private client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

  constructor(private broadcast: (event: WsEvent) => void) {}

  async run(scan: Scan): Promise<void> {
    const maxDepth = Number(process.env["SCAN_MAX_DEPTH"] ?? scan.scope.maxDepth ?? 3);
    abortSignals.set(scan.id, false);

    // Step 1: Set scan to running
    await updateScanStatus(scan.id, "running");
    const runningState: Scan = { ...scan, status: "running" };
    this.broadcast({ type: "scan_status", scan: runningState });

    // Step 2: Create root nodes for each target
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

    // Audit: scan started
    await createAuditEntry({
      id: randomUUID(),
      scanId: scan.id,
      timestamp: new Date().toISOString(),
      actor: "orchestrator",
      action: "scan-started",
      scopeValid: true,
      details: { targets: scan.scope.targets, maxDepth, rootNodesCreated: rootNodes.length }
    });

    let nodesComplete = 0;
    let currentRound = 0;
    let roundSummary = "";
    let completedCountForRound = 0;

    // Step 4: Main loop
    const maxDurationMs =
      (Number(process.env["SCAN_MAX_DURATION_MINUTES"] ?? scan.scope.maxDurationMinutes ?? 10)) *
      60 *
      1000;
    const deadline = Date.now() + maxDurationMs;

    while (Date.now() < deadline) {
      // Check abort
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

      // Dequeue next node
      const node = await this.queue.dequeue(scan.id, maxDepth);
      if (!node) break; // No more pending nodes

      // Check abort again after dequeue
      if (abortSignals.get(scan.id) === true) {
        await updateScanStatus(scan.id, "aborted", {
          completedAt: new Date().toISOString(),
          nodesComplete
        });
        abortSignals.delete(scan.id);
        return;
      }

      // Mark in-progress
      await updateNodeStatus(node.id, "in-progress");
      const inProgressNode: DfsNode = { ...node, status: "in-progress" };
      this.broadcast({ type: "node_updated", node: inProgressNode });

      // Validate scope
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

      // Dispatch agent
      try {
        const agent = this.getAgent(node.layer as SupportedLayer);
        if (!agent) {
          // Skip unsupported layers
          await updateNodeStatus(node.id, "skipped");
          this.broadcast({ type: "node_updated", node: { ...node, status: "skipped" } });
          continue;
        }

        // Get parent findings for context
        const allFindings = await getFindingsForScan(scan.id);
        const parentFindings = allFindings.filter(
          (f) => f.nodeId === node.parentId
        );

        const result = await agent.execute(node, {
          scanId: scan.id,
          scope: scan.scope,
          parentFindings,
          roundSummary
        });

        // Persist findings
        for (const rawFinding of result.findings) {
          const finding: Finding = {
            ...rawFinding,
            nodeId: node.id,
            scanId: scan.id,
            id: randomUUID(),
            createdAt: new Date().toISOString()
          };
          await createFinding(finding);
          this.broadcast({ type: "finding_added", finding });
        }

        // Cross-agent validation: HIGH/CRITICAL findings get re-verified
        const highRiskFindings = result.findings.filter(
          (f) => f.severity === "critical" || f.severity === "high"
        );
        if (highRiskFindings.length > 0) {
          await this.crossValidate(scan, node, highRiskFindings);
        }

        // Persist child nodes and enqueue
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

        // Update nodesTotal
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

      // Mark complete
      await updateNodeStatus(node.id, "complete");
      this.broadcast({ type: "node_updated", node: { ...node, status: "complete" } });
      nodesComplete++;
      completedCountForRound++;

      await updateScanStatus(scan.id, "running", { nodesComplete, nodesTotal });

      // Every 3 completed nodes: run orchestrator analysis
      if (completedCountForRound >= 3) {
        completedCountForRound = 0;
        currentRound++;
        roundSummary = await this.orchestratorAnalysis(scan.id, currentRound);
        this.broadcast({ type: "round_complete", round: currentRound, summary: roundSummary });

        await updateScanStatus(scan.id, "running", { currentRound });

        await createAuditEntry({
          id: randomUUID(),
          scanId: scan.id,
          timestamp: new Date().toISOString(),
          actor: "orchestrator",
          action: "round-complete",
          scopeValid: true,
          details: { round: currentRound, summary: roundSummary }
        });
      }
    }

    // Step 5: Mark complete
    const completedAt = new Date().toISOString();
    await updateScanStatus(scan.id, "complete", { completedAt, nodesComplete, nodesTotal });

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

    // Step 6: Generate report and store it
    try {
      const report = await generateReport(scan.id, this.broadcast);
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
        return new L3Agent();
      case "L4":
        return new L4Agent();
      case "L5":
        return new L5Agent();
      case "L6":
        return new L6Agent();
      case "L7":
        return new L7Agent();
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Cross-agent validation — second opinion for HIGH/CRITICAL findings
  // ---------------------------------------------------------------------------

  private async crossValidate(
    scan: Scan,
    node: DfsNode,
    highRiskFindings: Array<Omit<Finding, "id" | "createdAt">>
  ): Promise<void> {
    try {
      const summary = highRiskFindings
        .map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`)
        .join("\n");

      const response = await this.client.messages.create({
        model: process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a senior penetration tester doing a second-opinion review of flagged vulnerabilities. Be critical and verify if the findings are genuine.",
        messages: [
          {
            role: "user",
            content: `Validate these HIGH/CRITICAL findings on target ${node.target} (${node.layer} layer):\n\n${summary}\n\nFor each finding, respond with JSON array where each item has:\n{ "title": "...", "validated": true|false, "reason": "brief reason" }\nReturn ONLY valid JSON array.`
          }
        ]
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "";
      const validations = JSON.parse(text) as Array<{ title: string; validated: boolean; reason: string }>;

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

    // Normalize: strip port for comparison (host.docker.internal:3000 → host.docker.internal)
    const stripPort = (t: string) => t.replace(/:\d+$/, "");
    const targetHost = stripPort(target);

    for (const exclusion of exclusions) {
      const excHost = stripPort(exclusion);
      if (targetHost === excHost || targetHost.startsWith(excHost)) return false;
    }

    for (const scopeTarget of targets) {
      const scopeHost = stripPort(scopeTarget);
      // Exact hostname match (with or without port)
      if (target === scopeTarget || targetHost === scopeHost) return true;
      // Prefix match (child of scoped target)
      if (target.startsWith(scopeTarget) || targetHost.startsWith(scopeHost)) return true;
      // Reverse prefix (scope is a subnet prefix of target)
      if (scopeTarget.startsWith(target) || scopeHost.startsWith(targetHost)) return true;
    }

    return false;
  }

  private async orchestratorAnalysis(scanId: string, round: number): Promise<string> {
    try {
      const findings = await getFindingsForScan(scanId);

      const summary = findings
        .slice(-20) // last 20 findings for context
        .map((f) => `[${f.severity}] ${f.title} on ${f.nodeId}`)
        .join("\n");

      const response = await this.client.messages.create({
        model: process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-6",
        max_tokens: 512,
        system: "You are an AI penetration testing orchestrator. Analyze findings and prioritize next steps.",
        messages: [
          {
            role: "user",
            content: `Round ${round} analysis. Current findings:\n${summary || "No findings yet."}\n\nAnalyze these findings. Which targets/services pose the highest risk? What should the next phase of testing focus on? Reply in 2-3 sentences.`
          }
        ]
      });

      return response.content[0]?.type === "text"
        ? response.content[0].text
        : `Round ${round} complete. Continuing scan with highest-risk nodes prioritized.`;
    } catch (err: unknown) {
      console.error("Orchestrator analysis error:", err instanceof Error ? err.message : err);
      return `Round ${round} complete. Continuing scan with highest-risk nodes prioritized.`;
    }
  }
}

// Re-export abort signals map access for use in routes
export { abortSignals };
