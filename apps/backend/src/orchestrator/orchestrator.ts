import { randomUUID } from "crypto";
import type {
  AgentNote,
  DfsNode,
  Finding,
  GraceReport,
  Observation,
  OsiLayer,
  Scan,
  ScanLlmConfig,
  ToolRun,
  ValidationStatus,
  WsEvent
} from "@synosec/contracts";
import {
  boostNodeRiskScore,
  createAuditEntry,
  createFinding,
  getFindingsForScan,
  linkDiscoveredNodes,
  getVulnerabilityChains,
  updateNodeStatus,
  updateScanStatus
} from "../db/neo4j.js";
import { L3Agent } from "../agents/l3-agent.js";
import { L4Agent } from "../agents/l4-agent.js";
import { L5Agent } from "../agents/l5-agent.js";
import { L6Agent } from "../agents/l6-agent.js";
import { L7Agent } from "../agents/l7-agent.js";
import { BrokerExecutionError, ToolBroker } from "../broker/tool-broker.js";
import { confidenceEngine } from "../broker/confidence-engine.js";
import { evidenceStore } from "../broker/evidence-store.js";
import { DfsQueue } from "./dfs-graph.js";
import { GraceReasoner } from "./grace-reasoner.js";
import { generateReport } from "./report.js";
import { reportStore } from "../runtime/report-store.js";
import { createLlmClient, type LlmClient } from "../llm/client.js";
import {
  getInitialLayerForScope,
  normalizeScopeForRun,
  shouldRunSecondaryLlmPasses
} from "./execution-policy.js";
import { analyzeTargetInput } from "../tools/scan-tools.js";

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
  private pathState = new Map<string, { nodeId: string; evidenceKeys: Set<string> }>();

  constructor(
    private broadcast: (event: WsEvent) => void,
    private readonly llmConfig?: ScanLlmConfig
  ) {
    this.llmClient = createLlmClient(llmConfig);
    this.broker = new ToolBroker({ broadcast });
  }

  private publishAgentNote(
    scanId: string,
    input: Omit<AgentNote, "id" | "scanId" | "agentId" | "createdAt">
  ): void {
    const agentNote: AgentNote = {
      id: randomUUID(),
      scanId,
      agentId: "orchestrator",
      createdAt: new Date().toISOString(),
      ...input
    };
    evidenceStore.addAgentNote(agentNote);
    this.broadcast({ type: "agent_note_added", agentNote });
  }

  async run(scan: Scan): Promise<void> {
    const normalizedScope = normalizeScopeForRun(scan.scope, this.llmConfig);
    const effectiveScan: Scan = { ...scan, scope: normalizedScope };
    const maxDepth = Number(process.env["SCAN_MAX_DEPTH"] ?? scan.scope.maxDepth ?? 3);
    abortSignals.set(scan.id, false);

    await updateScanStatus(scan.id, "running");
    const runningState: Scan = { ...effectiveScan, status: "running" };
    this.broadcast({ type: "scan_status", scan: runningState });

    let nodesTotal = 0;
    const rootNodes: DfsNode[] = [];

    for (const target of effectiveScan.scope.targets) {
      const rootNode: DfsNode = {
        id: randomUUID(),
        scanId: scan.id,
        target,
        layer: getInitialLayerForScope(effectiveScan.scope),
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
        normalizedLayers: effectiveScan.scope.layers,
        maxDepth,
        rootNodesCreated: rootNodes.length,
        llmProvider: this.llmClient.provider,
        llmModel: this.llmClient.model
      }
    });

    const preflightAnalyses = scan.scope.targets.map((target) => analyzeTargetInput(target));
    const repairedTargets = preflightAnalyses.filter((analysis) => analysis.changed);
    this.publishAgentNote(scan.id, {
      stage: "plan",
      title: "Target preflight analysis",
      summary:
        repairedTargets.length > 0
          ? `Normalized ${repairedTargets.length} target input${repairedTargets.length === 1 ? "" : "s"} before scanning.`
          : "Validated target input before scanning. No target repairs were required.",
      detail: preflightAnalyses
        .map((analysis) => {
          const reasonText = analysis.reasons.length > 0 ? `\nReasons: ${analysis.reasons.join(" ")}` : "";
          return `- ${analysis.input} -> ${analysis.normalizedTarget}${reasonText}`;
        })
        .join("\n")
    });
    this.publishAgentNote(scan.id, {
      stage: "plan",
      title: "DFS scan initialized",
      summary: `Created ${rootNodes.length} root node${rootNodes.length === 1 ? "" : "s"} across ${effectiveScan.scope.layers.join(", ")} with maximum depth ${maxDepth}.`,
      detail: `Targets: ${effectiveScan.scope.targets.join(", ")}\nLLM: ${this.llmClient.provider}/${this.llmClient.model}`
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
      this.publishAgentNote(scan.id, {
        nodeId: node.id,
        stage: "plan",
        title: `Evaluating ${node.layer} node`,
        summary: `Dequeued ${node.target}${node.port !== undefined ? `:${node.port}` : ""} at depth ${node.depth} with risk ${(node.riskScore * 100).toFixed(0)}%.`,
        detail: `Layer=${node.layer}${node.service ? `\nService=${node.service}` : ""}`
      });

      const inScope = this.isInScope(node.target, effectiveScan);
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
          scope: effectiveScan.scope,
          parentFindings,
          roundSummary
        };

        // ---------------------------------------------------------------
        // Agentic reasoning loop
        // Each iteration:
        //   1. Run the agent's planned tool requests
        //   2. Analyze results (is this reasonable? what does it tell us?)
        //   3. Decide: fix errors, probe deeper, or stop
        // ---------------------------------------------------------------
        const initialResult = await agent.execute(node, agentContext);
        this.publishAgentNote(scan.id, {
          nodeId: node.id,
          stage: "plan",
          title: `${agent.agentId} planned next actions`,
          summary: initialResult.agentSummary,
          detail: initialResult.requestedToolRuns.length > 0
            ? initialResult.requestedToolRuns
                .map((r) => `- ${r.adapter} -> ${r.target}${r.port !== undefined ? `:${r.port}` : ""} (${r.riskTier})`)
                .join("\n")
            : "No direct tool requests were queued."
        });

        const allObservations: Observation[] = [];
        const allToolRuns: ToolRun[] = [];
        const allBrokerFindings: Array<Omit<Finding, "id" | "createdAt">> = [];
        const allChildNodes: Array<Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">> = [
          ...initialResult.childNodes
        ];

        const maxAgentIterations = Number(process.env["AGENT_MAX_ITERATIONS"] ?? 3);
        let currentRequests = initialResult.requestedToolRuns;
        // Start loop only if agent opted in (isDone !== false means done after first pass)
        let agentWantsContinuation = initialResult.isDone === false;

        for (let iteration = 0; iteration < maxAgentIterations; iteration++) {
          if (currentRequests.length === 0) break;

          const brokerResult = await this.broker.executeRequests({
            scan,
            nodeId: node.id,
            agentId: agent.agentId,
            requests: currentRequests
          });

          for (const rawFinding of brokerResult.findings) {
            let finding: Finding = {
              ...rawFinding,
              id: randomUUID(),
              createdAt: new Date().toISOString()
            };
            await createFinding(finding);
            this.broadcast({ type: "finding_added", finding });
            this.publishAgentNote(scan.id, {
              nodeId: node.id,
              findingId: finding.id,
              stage: "finding",
              title: finding.title,
              summary: finding.description,
              detail: finding.evidence
            });

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
          if (highRiskFindings.length > 0 && shouldRunSecondaryLlmPasses(this.llmConfig)) {
            await this.crossValidate(scan, node, highRiskFindings);
          }

          allObservations.push(...brokerResult.observations);
          allToolRuns.push(...brokerResult.toolRuns);
          allBrokerFindings.push(...brokerResult.findings);

          // Stop if agent said it's done or we've hit the iteration cap
          if (!agentWantsContinuation || iteration >= maxAgentIterations - 1) break;

          // Ask the agent: given what we found, what's the next step?
          const nextResult = await agent.analyzeAndPlan(
            node,
            agentContext,
            allObservations,
            allBrokerFindings,
            iteration + 1,
            allToolRuns
          );

          this.publishAgentNote(scan.id, {
            nodeId: node.id,
            stage: "analysis",
            title: `${agent.agentId} iteration ${iteration + 1} reasoning`,
            summary: nextResult.agentSummary,
            detail: nextResult.requestedToolRuns.length > 0
              ? nextResult.requestedToolRuns
                  .map((r) => `- ${r.adapter} -> ${r.target}${r.port !== undefined ? `:${r.port}` : ""}`)
                  .join("\n")
              : "No further tool runs needed."
          });

          if (nextResult.childNodes.length > 0) {
            allChildNodes.push(...nextResult.childNodes);
          }

          agentWantsContinuation = nextResult.isDone === false && nextResult.requestedToolRuns.length > 0;
          if (!agentWantsContinuation) break;

          currentRequests = nextResult.requestedToolRuns;
        }

        // Derive child nodes using all accumulated observations
        const derivedChildNodes = this.deriveChildNodes(node, allObservations);
        const evidenceKey = this.buildEvidenceKey(node, allObservations, allBrokerFindings);

        if (derivedChildNodes.length > 0) {
          this.publishAgentNote(scan.id, {
            nodeId: node.id,
            stage: "analysis",
            title: "Derived new DFS branches",
            summary: `Generated ${derivedChildNodes.length} downstream node${derivedChildNodes.length === 1 ? "" : "s"} from observed evidence.`,
            detail: derivedChildNodes
              .map((child) => `- ${child.layer} ${child.target}${child.port !== undefined ? `:${child.port}` : ""}${child.service ? ` (${child.service})` : ""}`)
              .join("\n")
          });
        }

        for (const rawChild of [...allChildNodes, ...derivedChildNodes]) {
          if (!effectiveScan.scope.layers.includes(rawChild.layer)) {
            await createAuditEntry({
              id: randomUUID(),
              scanId: scan.id,
              timestamp: new Date().toISOString(),
              actor: "orchestrator",
              action: "child-node-skipped-layer-disabled",
              targetNodeId: node.id,
              scopeValid: true,
              details: { childTarget: rawChild.target, childLayer: rawChild.layer }
            });
            continue;
          }

          const decision = await this.registerPathCandidate(scan.id, node.id, rawChild, evidenceKey);
          if (decision.outcome === "linked") {
            this.publishAgentNote(scan.id, {
              nodeId: node.id,
              stage: "analysis",
              title: "Skipped known pentest path",
              summary: `Path ${decision.pathKey} was already discovered, so it was linked instead of being considered for discovery again.`,
              detail: `Existing node: ${decision.nodeId}\nEvidence key: ${evidenceKey}`
            });
            continue;
          }

          const child: DfsNode = {
            ...rawChild,
            id: decision.nodeId,
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

        if (err instanceof BrokerExecutionError) {
          const completedAt = new Date().toISOString();

          await updateNodeStatus(node.id, "skipped");
          this.broadcast({ type: "node_updated", node: { ...node, status: "skipped" } });

          await createAuditEntry({
            id: randomUUID(),
            scanId: scan.id,
            timestamp: completedAt,
            actor: "orchestrator",
            action: "scan-failed-broker-execution",
            targetNodeId: node.id,
            scopeValid: true,
            details: err.details
          });

          await updateScanStatus(scan.id, "failed", { completedAt, nodesComplete, nodesTotal });
          confidenceEngine.clearScan(scan.id);
          this.broadcast({
            type: "scan_status",
            scan: {
              ...scan,
              scope: effectiveScan.scope,
              status: "failed",
              nodesComplete,
              nodesTotal,
              currentRound,
              completedAt
            }
          });
          abortSignals.delete(scan.id);
          return;
        }

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

        if (shouldRunSecondaryLlmPasses(this.llmConfig)) {
          roundSummary = await this.orchestratorAnalysis(scan.id, currentRound, graceReport);
        } else {
          roundSummary = `Round ${currentRound} complete. Continuing tool-backed scan.`;
        }
        this.broadcast({ type: "round_complete", round: currentRound, summary: roundSummary });
        this.publishAgentNote(scan.id, {
          stage: "analysis",
          title: `Round ${currentRound} analysis`,
          summary: roundSummary,
          detail: graceReport
            ? `Prioritized targets: ${graceReport.prioritizedTargets.join(", ") || "none"}\nChains detected: ${graceReport.detectedChains.length}`
            : undefined
        });

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
        scope: effectiveScan.scope,
        status: "complete",
        nodesComplete,
        nodesTotal,
        currentRound,
        completedAt
      }
    });
    this.publishAgentNote(scan.id, {
      stage: "analysis",
      title: "Scan completed",
      summary: `Completed ${nodesComplete} of ${nodesTotal} nodes across ${currentRound} analysis round${currentRound === 1 ? "" : "s"}.`,
      detail: `Final status: complete`
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
      this.publishAgentNote(scan.id, {
        nodeId: node.id,
        stage: "analysis",
        title: "Cross-validation finished",
        summary: `Reviewed ${highRiskFindings.length} high-risk finding${highRiskFindings.length === 1 ? "" : "s"} for ${node.target}.`,
        detail: validations
          .map((validation) => `- ${validation.title}: ${validation.validationStatus} (${validation.reason})`)
          .join("\n")
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

  }

  private deriveChildNodes(
    node: DfsNode,
    observations: Observation[]
  ): Array<Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">> {
    if (node.layer !== "L4") {
      return [];
    }

    const nextDepth = node.depth + 1;
    const children = new Map<string, Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">>();

    for (const observation of observations) {
      if (observation.adapter !== "service_scan" || observation.port === undefined) {
        continue;
      }

      for (const candidate of this.mapObservationToChildNodes(node.target, nextDepth, observation)) {
        const key = `${candidate.layer}:${candidate.target}:${candidate.port ?? "none"}:${candidate.service ?? "none"}`;
        children.set(key, candidate);
      }
    }

    return [...children.values()];
  }

  private buildPathKey(
    node: Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">
  ): string {
    return [
      node.layer,
      node.target,
      node.port ?? "none",
      node.service ?? "none"
    ].join(":");
  }

  private buildEvidenceKey(
    node: DfsNode,
    observations: Observation[],
    findings: Array<Omit<Finding, "id" | "createdAt">>
  ): string {
    const observationKeys = observations
      .map((observation) => `${observation.key}:${observation.port ?? "none"}`)
      .sort()
      .join("|");
    const findingKeys = findings
      .map((finding) => `${finding.title}:${finding.technique}:${finding.severity}`)
      .sort()
      .join("|");

    return `parent=${node.id};observations=${observationKeys || "none"};findings=${findingKeys || "none"}`;
  }

  private async registerPathCandidate(
    scanId: string,
    parentNodeId: string,
    node: Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">,
    evidenceKey: string
  ): Promise<
    | { outcome: "linked"; nodeId: string; pathKey: string }
    | { outcome: "new"; nodeId: string; pathKey: string }
  > {
    const pathKey = this.buildPathKey(node);
    const stateKey = `${scanId}:${pathKey}`;
    const existingState = this.pathState.get(stateKey);

    if (existingState) {
      existingState.evidenceKeys.add(evidenceKey);
      await linkDiscoveredNodes(parentNodeId, existingState.nodeId);
      return { outcome: "linked", nodeId: existingState.nodeId, pathKey };
    }

    const nodeId = randomUUID();
    const nextEvidenceKeys = new Set<string>();
    nextEvidenceKeys.add(evidenceKey);
    this.pathState.set(stateKey, { nodeId, evidenceKeys: nextEvidenceKeys });

    return { outcome: "new", nodeId, pathKey };
  }

  private mapObservationToChildNodes(
    target: string,
    depth: number,
    observation: Observation
  ): Array<Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">> {
    const port = observation.port;
    if (port === undefined) {
      return [];
    }

    const service = this.inferServiceName(observation);
    const nodes: Array<Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">> = [];

    if (service === "ssh" || service === "smb") {
      nodes.push({
        target,
        layer: "L5",
        service,
        port,
        riskScore: service === "smb" ? 0.75 : 0.45,
        status: "pending",
        depth
      });
    }

    if (service === "https" || port === 443 || port === 8443) {
      nodes.push({
        target,
        layer: "L6",
        service: "https",
        port,
        riskScore: 0.55,
        status: "pending",
        depth
      });
    }

    if (this.isApplicationService(service, port)) {
      nodes.push({
        target,
        layer: "L7",
        service,
        port,
        riskScore: this.riskScoreForApplicationPort(port, service),
        status: "pending",
        depth
      });
    }

    return nodes;
  }

  private inferServiceName(observation: Observation): string {
    const titleMatch = observation.title.match(/^Open\s+(.+?)\s+service on\s+\d+$/i);
    return titleMatch?.[1]?.toLowerCase() ?? "unknown";
  }

  private isApplicationService(service: string, port: number): boolean {
    if (["http", "https", "http-proxy", "postgresql", "mysql", "mongodb", "redis"].includes(service)) {
      return true;
    }

    return [80, 443, 8080, 8443, 3000, 5432, 3306, 27017, 6379].includes(port);
  }

  private riskScoreForApplicationPort(port: number, service: string): number {
    if (["postgresql", "mysql", "mongodb", "redis"].includes(service) || [5432, 3306, 27017, 6379].includes(port)) {
      return 0.78;
    }

    if (port === 443 || port === 8443) {
      return 0.68;
    }

    return 0.7;
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
