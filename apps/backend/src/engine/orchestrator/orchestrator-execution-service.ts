import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import {
  executionReportFindingSchema,
  executionReportToolActivitySchema,
  type AiTool,
  type ExecutionReportFinding,
  type ExecutionReportToolActivity,
  type Observation,
  type ToolRun
} from "@synosec/contracts";
import type {
  AttackMapEdge,
  AttackMapNode,
  AttackPlan,
  AttackPlanPhase,
  OrchestratorEvent,
  Severity
} from "@/engine/orchestrator/orchestrator-stream.js";
import { OrchestratorStream } from "@/engine/orchestrator/orchestrator-stream.js";
import { executeScriptedTool } from "@/engine/tools/script-executor.js";
import { compileToolRequestFromDefinition } from "@/modules/ai-tools/tool-definition.compiler.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import { prisma } from "@/shared/database/prisma-client.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { AiProvidersRepository, StoredAiProvider } from "@/modules/ai-providers/index.js";

const execFileAsync = promisify(execFile);

type OrchestratorRunnableTool = AiTool & {
  source: "custom";
  executorType: "bash";
  bashSource: string;
};

type ResolvedOrchestratorTool = {
  requestedName: string;
  tool: OrchestratorRunnableTool;
};

export type OrchestratorRunRecord = {
  id: string;
  targetUrl: string;
  status: string;
  phase: string;
  recon: unknown;
  plan: unknown;
  mapNodes: unknown;
  mapEdges: unknown;
  findings: ExecutionReportFinding[];
  toolActivity: ExecutionReportToolActivity[];
  summary: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReconResult = {
  openPorts: { port: number; protocol: string; service: string; version: string }[];
  technologies: string[];
  httpHeaders: Record<string, string>;
  serverInfo: { os?: string; webServer?: string; cms?: string };
  interestingPaths: string[];
  rawNmap: string;
  rawCurl: string;
};

type SuggestedToolAttempt = {
  toolId: string;
  toolRunId: string;
  toolName: string;
  commandPreview: string;
  output: string;
  observations: Observation[];
  exitCode: number;
  statusReason: string | null;
};

type DecisionEnvelope<T> = {
  reasoningSummary: string;
  data: T;
};

function normalizeToolName(value: string) {
  return value.trim().toLowerCase();
}

function createToolRun(runId: string, phase: AttackPlanPhase, tool: OrchestratorRunnableTool, startedAt: string, commandPreview: string, target: string): ToolRun {
  return {
    id: randomUUID(),
    scanId: runId,
    tacticId: phase.id,
    agentId: runId,
    toolId: tool.id,
    tool: tool.name,
    executorType: "bash",
    capabilities: tool.capabilities,
    target,
    status: "running",
    riskTier: tool.riskTier,
    justification: `Attack map phase ${phase.name} requested ${tool.name}.`,
    commandPreview,
    dispatchMode: "local",
    startedAt
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapRow(row: {
  id: string;
  targetUrl: string;
  status: string;
  phase: string;
  recon: unknown;
  plan: unknown;
  mapNodes: unknown;
  mapEdges: unknown;
  findings: unknown;
  toolActivity: unknown;
  summary: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): OrchestratorRunRecord {
  return {
    ...row,
    findings: Array.isArray(row.findings)
      ? row.findings
          .map((entry) => executionReportFindingSchema.safeParse(entry))
          .filter((entry): entry is { success: true; data: ExecutionReportFinding } => entry.success)
          .map((entry) => entry.data)
      : [],
    toolActivity: Array.isArray(row.toolActivity)
      ? row.toolActivity
          .map((entry) => executionReportToolActivitySchema.safeParse(entry))
          .filter((entry): entry is { success: true; data: ExecutionReportToolActivity } => entry.success)
          .map((entry) => entry.data)
      : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJson(value: unknown): any { return JSON.parse(JSON.stringify(value)); }

export class OrchestratorExecutionEngineService {
  constructor(
    private readonly stream: OrchestratorStream,
    private readonly aiProvidersRepository: AiProvidersRepository,
    private readonly aiToolsRepository: AiToolsRepository,
    private readonly executionReportsService: ExecutionReportsService = new ExecutionReportsService()
  ) {}

  async createRun(targetUrl: string, providerId: string): Promise<OrchestratorRunRecord> {
    const provider = await this.aiProvidersRepository.getStoredById(providerId);
    this.assertProviderSupportsOrchestration(provider);

    const id = randomUUID();
    const row = await prisma.orchestratorRun.create({
      data: { id, targetUrl, status: "pending", phase: "pending", mapNodes: [], mapEdges: [], findings: [], toolActivity: [] }
    });
    return mapRow(row);
  }

  async getRun(id: string): Promise<OrchestratorRunRecord | null> {
    const row = await prisma.orchestratorRun.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async listRuns(): Promise<OrchestratorRunRecord[]> {
    const rows = await prisma.orchestratorRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return rows.map(mapRow);
  }

  private async listOrchestratorRunnableTools(): Promise<OrchestratorRunnableTool[]> {
    const result = await this.aiToolsRepository.list({
      page: 1,
      pageSize: 100,
      q: "",
      sortBy: "name",
      sortDirection: "asc"
    });

    return result.items.filter((tool): tool is OrchestratorRunnableTool => (
      tool.source === "custom"
      && tool.executorType === "bash"
      && typeof tool.bashSource === "string"
      && tool.bashSource.trim().length > 0
    ));
  }

  private async resolvePlannedTools(phase: AttackPlanPhase): Promise<ResolvedOrchestratorTool[]> {
    const catalog = await this.listOrchestratorRunnableTools();
    const byNormalizedName = new Map<string, OrchestratorRunnableTool[]>();

    for (const tool of catalog) {
      const key = normalizeToolName(tool.name);
      const current = byNormalizedName.get(key) ?? [];
      current.push(tool);
      byNormalizedName.set(key, current);
    }

    return [...new Set(phase.tools)].map((requestedName) => {
      const matches = byNormalizedName.get(normalizeToolName(requestedName)) ?? [];
      if (matches.length === 0) {
        throw new RequestError(500, `Attack map phase "${phase.name}" selected an unknown AI tool: ${requestedName}.`, {
          code: "ORCHESTRATOR_TOOL_UNKNOWN",
          userFriendlyMessage: "The attack map selected an unknown AI tool."
        });
      }

      if (matches.length > 1) {
        throw new RequestError(500, `Attack map phase "${phase.name}" matched multiple AI tools named ${requestedName}.`, {
          code: "ORCHESTRATOR_TOOL_NAME_AMBIGUOUS",
          userFriendlyMessage: "The attack map selected an ambiguous AI tool name."
        });
      }

      return {
        requestedName,
        tool: matches[0]!
      };
    });
  }

  startAsync(runId: string, targetUrl: string, providerId: string) {
    void this.execute(runId, targetUrl, providerId).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      void (async () => {
        await prisma.orchestratorRun.update({
          where: { id: runId },
          data: { status: "failed", error: message }
        });
        await this.executionReportsService.createForAttackMapRun(runId);
        this.stream.publish(runId, { type: "failed", error: message });
      })().catch((reportError) => {
        console.error("Failed to persist attack-map failure report.", reportError);
        this.stream.publish(runId, { type: "failed", error: message });
      });
    });
  }

  private async execute(runId: string, targetUrl: string, providerId: string) {
    const provider = await this.aiProvidersRepository.getStoredById(providerId);
    this.assertProviderSupportsOrchestration(provider);

    const modelName = provider.model;
    const providerLabel = `${provider.name} (${provider.kind}:${modelName})`;
    const nodes: AttackMapNode[] = [];
    const edges: AttackMapEdge[] = [];
    const reportedFindings: ExecutionReportFinding[] = [];
    const toolActivity: ExecutionReportToolActivity[] = [];

    const emit = (event: OrchestratorEvent) => this.stream.publish(runId, event);
    const emitReasoning = (phase: string, title: string, summary: string) => {
      emit({ type: "reasoning", phase, title, summary });
      emit({ type: "log", level: "info", message: `${title}: ${summary}` });
    };
    const addNode = async (node: AttackMapNode) => {
      nodes.push(node);
      await prisma.orchestratorRun.update({ where: { id: runId }, data: { mapNodes: toJson(nodes), mapEdges: toJson(edges) } });
      emit({ type: "node_added", node });
    };
    const updateNode = async (id: string, patch: Partial<AttackMapNode>) => {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx === -1) return;
      nodes[idx] = { ...nodes[idx]!, ...patch };
      await prisma.orchestratorRun.update({ where: { id: runId }, data: { mapNodes: toJson(nodes) } });
      emit({ type: "node_updated", node: nodes[idx]! });
    };
    const addEdge = async (edge: AttackMapEdge) => {
      edges.push(edge);
      await prisma.orchestratorRun.update({ where: { id: runId }, data: { mapEdges: toJson(edges) } });
      emit({ type: "edge_added", edge });
    };
    const persistReportingArtifacts = async () => {
      await prisma.orchestratorRun.update({
        where: { id: runId },
        data: {
          findings: toJson(reportedFindings),
          toolActivity: toJson(toolActivity)
        }
      });
    };
    const recordFinding = async (finding: ExecutionReportFinding) => {
      reportedFindings.push(finding);
      await persistReportingArtifacts();
    };
    const recordToolActivity = async (activity: ExecutionReportToolActivity) => {
      toolActivity.push(activity);
      await persistReportingArtifacts();
    };
    const updateToolActivity = async (id: string, patch: Partial<ExecutionReportToolActivity>) => {
      const index = toolActivity.findIndex((entry) => entry.id === id);
      if (index === -1) {
        throw new RequestError(500, `Attack map tool activity ${id} could not be updated because it was not persisted.`, {
          code: "ORCHESTRATOR_TOOL_ACTIVITY_MISSING"
        });
      }

      toolActivity[index] = executionReportToolActivitySchema.parse({
        ...toolActivity[index],
        ...patch
      });
      await persistReportingArtifacts();
    };

    const url = new URL(targetUrl.includes("://") ? targetUrl : `http://${targetUrl}`);
    const host = url.hostname;
    const curlCmd = `curl -sI --max-time 8 -L ${targetUrl}`;
    const nmapPorts = "21,22,25,80,443,3000,3306,4443,5432,6379,8080,8443,8888,27017";
    const nmapCmd = `nmap -sV --open -T4 --version-intensity 3 -p ${nmapPorts} ${host}`;

    const targetNodeId = randomUUID();
    await addNode({
      id: targetNodeId,
      type: "target",
      label: targetUrl,
      status: "scanning",
      data: {
        url: targetUrl,
        host,
        command: curlCmd,
        sourceType: "http",
        source: targetUrl
      }
    });

    await prisma.orchestratorRun.update({ where: { id: runId }, data: { status: "running", phase: "recon" } });
    emit({ type: "phase_changed", phase: "recon", status: "running" });
    emit({ type: "log", level: "info", message: `Starting reconnaissance against ${targetUrl}` });
    emit({ type: "log", level: "info", message: `Decision model: ${providerLabel}` });

    const recon = await this.runRecon(targetUrl, runId, provider, modelName, emitReasoning);
    await prisma.orchestratorRun.update({ where: { id: runId }, data: { recon } });

    await updateNode(targetNodeId, {
      status: "completed",
      data: {
        url: targetUrl,
        host,
        command: curlCmd,
        sourceType: "http",
        source: targetUrl,
        rawOutput: recon.rawCurl.slice(0, 800)
      }
    });

    const portNodeIds = new Map<number, string>();
    for (const portEntry of recon.openPorts) {
      const nodeId = randomUUID();
      portNodeIds.set(portEntry.port, nodeId);
      const nmapLine = recon.rawNmap.split("\n").find((line) => line.includes(`${portEntry.port}/`)) ?? "";
      await addNode({
        id: nodeId,
        type: "port",
        label: `${portEntry.port}/${portEntry.protocol} ${portEntry.service}`,
        status: "completed",
        data: {
          port: portEntry.port,
          protocol: portEntry.protocol,
          service: portEntry.service,
          version: portEntry.version,
          command: nmapCmd,
          sourceType: "nmap",
          source: host,
          rawOutput: nmapLine || recon.rawNmap.slice(0, 400)
        }
      });
      await addEdge({ id: randomUUID(), source: targetNodeId, target: nodeId });
    }

    for (const tech of recon.technologies.slice(0, 8)) {
      const nodeId = randomUUID();
      const techLines = recon.rawCurl.split("\n").filter((line) =>
        line.toLowerCase().includes(tech.toLowerCase().split(" ")[0] ?? tech.toLowerCase())
      ).join("\n");
      await addNode({
        id: nodeId,
        type: "tech",
        label: tech,
        status: "completed",
        data: {
          tech,
          command: curlCmd,
          sourceType: "http-header",
          source: targetUrl,
          rawOutput: techLines || recon.rawCurl.split("\n").slice(0, 6).join("\n")
        }
      });
      await addEdge({ id: randomUUID(), source: targetNodeId, target: nodeId });
    }

    await prisma.orchestratorRun.update({ where: { id: runId }, data: { phase: "planning" } });
    emit({ type: "phase_changed", phase: "planning", status: "running" });
    emit({ type: "log", level: "info", message: "Generating attack plan from recon data" });

    const plannerTools = await this.listOrchestratorRunnableTools();
    const plan = await this.createPlan(targetUrl, recon, plannerTools, provider, modelName, emitReasoning);
    await prisma.orchestratorRun.update({ where: { id: runId }, data: { plan } });
    emit({ type: "plan_created", plan });

    const vectorNodeIds = new Map<string, string>();
    for (const phase of plan.phases) {
      const nodeId = randomUUID();
      vectorNodeIds.set(phase.id, nodeId);
      const severity = phase.priority === "critical" ? "critical" : phase.priority === "high" ? "high" : phase.priority === "medium" ? "medium" : "low";
      await addNode({
        id: nodeId,
        type: "vector",
        label: phase.name,
        status: "pending",
        severity,
        data: {
          phaseId: phase.id,
          priority: phase.priority,
          rationale: phase.rationale,
          tools: phase.tools,
          command: `AI synthesis (${providerLabel})`,
          sourceType: "ai",
          source: `Recon data analysis via ${providerLabel}`,
          rawOutput: `Priority: ${phase.priority}\nTarget: ${phase.targetService}\nRationale: ${phase.rationale}\nTools: ${phase.tools.join(", ")}`
        }
      });

      const portMatch = recon.openPorts.find((port) =>
        phase.targetService.toLowerCase().includes(String(port.port)) ||
        phase.targetService.toLowerCase().includes(port.service.toLowerCase())
      );
      const parentId = portMatch ? portNodeIds.get(portMatch.port) : undefined;
      await addEdge({ id: randomUUID(), source: parentId ?? targetNodeId, target: nodeId });
    }

    await prisma.orchestratorRun.update({ where: { id: runId }, data: { phase: "execution" } });
    emit({ type: "phase_changed", phase: "execution", status: "running" });

    const findings: { title: string; severity: string; description: string; vector: string }[] = [];

    for (const phase of plan.phases.slice(0, 3)) {
      const vectorNodeId = vectorNodeIds.get(phase.id);
      if (vectorNodeId) {
        await updateNode(vectorNodeId, { status: "scanning" });
      }
      emit({ type: "log", level: "info", message: `Executing: ${phase.name}` });

      const { findings: phaseFindings, probeCommand, probeOutput, toolAttempts } = await this.executePhase(
        targetUrl,
        phase,
        recon,
        runId,
        provider,
        modelName,
        emitReasoning,
        recordToolActivity,
        updateToolActivity
      );
      findings.push(...phaseFindings);

      if (vectorNodeId) {
        const patch: Partial<AttackMapNode> = { status: phaseFindings.length > 0 ? "vulnerable" : "completed" };
        if (phaseFindings.length > 0) patch.severity = (phaseFindings[0]?.severity as Severity | undefined) ?? "info";
        await updateNode(vectorNodeId, patch);
      }

      for (const finding of phaseFindings) {
        await recordFinding(executionReportFindingSchema.parse({
          id: randomUUID(),
          executionId: runId,
          executionKind: "attack-map",
          source: "attack-map-finding",
          severity: finding.severity,
          title: finding.title,
          type: "phase-finding",
          summary: finding.description,
          recommendation: null,
          confidence: null,
          targetLabel: targetUrl,
          evidence: toolAttempts.length > 0
            ? toolAttempts
                .filter((attempt) => attempt.output.trim().length > 0)
                .slice(0, 3)
                .map((attempt) => ({
                  sourceTool: attempt.toolName,
                  quote: (finding.rawEvidence ?? attempt.output).slice(0, 600),
                  toolRunRef: attempt.toolRunId
                }))
            : [],
          sourceToolIds: toolAttempts.map((attempt) => attempt.toolId),
          sourceToolRunIds: toolAttempts.map((attempt) => attempt.toolRunId),
          createdAt: new Date().toISOString()
        }));
        const nodeId = randomUUID();
        const findingNode: AttackMapNode = {
          id: nodeId,
          type: "finding",
          label: finding.title,
          status: "completed",
          data: {
            description: finding.description,
            vector: finding.vector,
            command: probeCommand,
            sourceType: "probe",
            source: targetUrl,
            rawOutput: finding.rawEvidence ?? probeOutput.slice(0, 600)
          }
        };
        if (finding.severity) findingNode.severity = finding.severity as Severity;
        if (vectorNodeId) findingNode.parentId = vectorNodeId;
        await addNode(findingNode);
        if (vectorNodeId) {
          await addEdge({ id: randomUUID(), source: vectorNodeId, target: nodeId });
        }
      }
    }

    const significantFindings = nodes.filter(
      (node) => node.type === "finding" && (node.severity === "critical" || node.severity === "high" || node.severity === "medium")
    );

    if (significantFindings.length > 0) {
      await prisma.orchestratorRun.update({ where: { id: runId }, data: { phase: "deep_analysis" } });
      emit({ type: "phase_changed", phase: "deep_analysis", status: "running" });
      emit({ type: "log", level: "info", message: `Deep-diving ${significantFindings.length} significant finding(s)` });

      for (const finding of significantFindings.slice(0, 4)) {
        emit({ type: "log", level: "info", message: `Deep analysis: ${finding.label}` });
        await updateNode(finding.id, { status: "scanning" });

        const childFindings = await this.deepDiveFinding(
          targetUrl,
          finding,
          nodes.filter((node) => node.type === "finding"),
          recon,
          provider,
          modelName,
          emitReasoning
        );

        await updateNode(finding.id, { status: finding.severity === "critical" || finding.severity === "high" ? "vulnerable" : "completed" });

        for (const child of childFindings) {
          await recordFinding(executionReportFindingSchema.parse({
            id: child.id,
            executionId: runId,
            executionKind: "attack-map",
            source: "attack-map-finding",
            severity: child.severity ?? "info",
            title: child.label,
            type: "deep-analysis-finding",
            summary: String(child.data["description"] ?? ""),
            recommendation: null,
            confidence: null,
            targetLabel: targetUrl,
            evidence: [],
            sourceToolIds: ["deep_analysis"],
            sourceToolRunIds: [],
            createdAt: new Date().toISOString()
          }));
          await addNode(child);
          await addEdge({ id: randomUUID(), source: finding.id, target: child.id, kind: "discovery" });
          findings.push({
            title: child.label,
            severity: child.severity ?? "info",
            description: String(child.data["description"] ?? ""),
            vector: String(child.data["vector"] ?? "")
          });
        }
      }
    }

    const allFindingNodes = nodes.filter((node) => node.type === "finding");

    if (allFindingNodes.length >= 2) {
      await prisma.orchestratorRun.update({ where: { id: runId }, data: { phase: "correlation" } });
      emit({ type: "phase_changed", phase: "correlation", status: "running" });
      emit({ type: "log", level: "info", message: `Correlating ${allFindingNodes.length} findings for attack chains` });

      const chains = await this.correlateAttackChains(allFindingNodes, targetUrl, provider, modelName, emitReasoning);

      for (const chain of chains) {
        const chainNodeId = randomUUID();
        await addNode({
          id: chainNodeId,
          type: "chain",
          label: chain.title,
          status: "vulnerable",
          severity: chain.severity,
          data: {
            description: chain.description,
            exploitation: chain.exploitation,
            impact: chain.impact,
            findingIds: chain.findingIds,
            sourceType: "ai",
            source: `Cross-finding correlation via ${providerLabel}`,
            rawOutput: `Attack chain involving ${chain.findingIds.length} findings.\n\nExploitation:\n${chain.exploitation}\n\nImpact:\n${chain.impact}`
          }
        });

        for (const findingId of chain.findingIds) {
          const findingExists = nodes.some((node) => node.id === findingId);
          if (findingExists) {
            await addEdge({ id: randomUUID(), source: findingId, target: chainNodeId, kind: "chain" });
          }
        }

        emit({ type: "log", level: "warn", message: `Chain found: ${chain.title} (${chain.severity})` });
      }
    }

    const allFindings = nodes.filter((node) => node.type === "finding");
    const chainCount = nodes.filter((node) => node.type === "chain").length;
    const summary = `Orchestration completed. ${recon.openPorts.length} ports, ${recon.technologies.length} technologies, ${plan.phases.length} vectors, ${allFindings.length} findings${chainCount > 0 ? `, ${chainCount} attack chain(s)` : ""}. Overall risk: ${plan.overallRisk}.`;
    await prisma.orchestratorRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        phase: "complete",
        summary,
        mapNodes: toJson(nodes),
        mapEdges: toJson(edges),
        findings: toJson(reportedFindings),
        toolActivity: toJson(toolActivity)
      }
    });
    await this.executionReportsService.createForAttackMapRun(runId);
    emit({ type: "phase_changed", phase: "complete", status: "completed" });
    emit({ type: "completed", summary });
  }

  private async runRecon(
    targetUrl: string,
    runId: string,
    provider: StoredAiProvider,
    model: string,
    emitReasoning: (phase: string, title: string, summary: string) => void
  ): Promise<ReconResult> {
    const emit = (message: string) => this.stream.publish(runId, { type: "log", level: "info", message });

    const url = new URL(targetUrl.includes("://") ? targetUrl : `http://${targetUrl}`);
    const host = url.hostname;
    const port = url.port || (url.protocol === "https:" ? "443" : "80");

    emit(`HTTP probe: ${targetUrl}`);
    let rawCurl = "";
    try {
      const { stdout } = await execFileAsync("curl", [
        "-sI", "--max-time", "8", "--connect-timeout", "5", "-L", targetUrl
      ], { timeout: 12_000 });
      rawCurl = stdout;
    } catch (error) {
      rawCurl = error instanceof Error ? error.message : String(error);
    }

    emit(`Port scan: ${host}`);
    let rawNmap = "";
    const commonPorts = "21,22,25,80,443,3000,3306,4443,5432,6379,8080,8443,8888,27017";
    try {
      const { stdout } = await execFileAsync("nmap", [
        "-sV", "--open", "-T4", "--version-intensity", "3",
        "-p", commonPorts, host
      ], { timeout: 60_000 });
      rawNmap = stdout;
    } catch (error) {
      rawNmap = error instanceof Error ? error.message : String(error);
    }

    emit(`Parsing recon results with ${provider.name}`);
    return this.parseReconWithAI(rawNmap, rawCurl, targetUrl, port, provider, model, emitReasoning);
  }

  private async parseReconWithAI(
    rawNmap: string,
    rawCurl: string,
    targetUrl: string,
    _port: string,
    provider: StoredAiProvider,
    model: string,
    emitReasoning: (phase: string, title: string, summary: string) => void
  ): Promise<ReconResult> {
    const envelope = await this.callStructuredDecisionModel<Partial<ReconResult>>(provider, model, [
      `You are a security analyst parsing raw recon output for ${targetUrl}.`,
      "Return ONLY a JSON object with this exact shape:",
      '{"reasoningSummary":"short summary of what recon signals matter most","data":{"openPorts":[{"port":80,"protocol":"tcp","service":"http","version":"nginx 1.18"}],"technologies":["nginx","PHP"],"httpHeaders":{"Server":"nginx"},"serverInfo":{"webServer":"nginx"},"interestingPaths":["/admin"]}}',
      "",
      "--- NMAP OUTPUT ---",
      rawNmap.slice(0, 3000),
      "",
      "--- HTTP HEADERS ---",
      rawCurl.slice(0, 2000)
    ].join("\n"));
    emitReasoning("recon", "Recon reasoning", envelope.reasoningSummary);
    const parsed = envelope.data;
    return {
      openPorts: Array.isArray(parsed.openPorts) ? parsed.openPorts : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      httpHeaders: typeof parsed.httpHeaders === "object" && parsed.httpHeaders !== null ? parsed.httpHeaders as Record<string, string> : {},
      serverInfo: typeof parsed.serverInfo === "object" && parsed.serverInfo !== null ? parsed.serverInfo as ReconResult["serverInfo"] : {},
      interestingPaths: Array.isArray(parsed.interestingPaths) ? parsed.interestingPaths : [],
      rawNmap,
      rawCurl
    };
  }

  private async createPlan(
    targetUrl: string,
    recon: ReconResult,
    plannerTools: OrchestratorRunnableTool[],
    provider: StoredAiProvider,
    model: string,
    emitReasoning: (phase: string, title: string, summary: string) => void
  ): Promise<AttackPlan> {
    const reconSummary = JSON.stringify({
      openPorts: recon.openPorts,
      technologies: recon.technologies,
      serverInfo: recon.serverInfo
    }, null, 2);

    if (plannerTools.length === 0) {
      throw new RequestError(500, "Attack map orchestration requires at least one custom bash AI tool, but none are available.", {
        code: "ORCHESTRATOR_TOOLS_UNAVAILABLE",
        userFriendlyMessage: "No runnable AI tools are available for the attack map."
      });
    }

    const availableTools = plannerTools.map((tool) => tool.name).join(", ");

    const envelope = await this.callStructuredDecisionModel<Partial<AttackPlan>>(provider, model, [
      `You are a senior penetration tester creating an attack plan for: ${targetUrl}`,
      "",
      "Recon results:",
      reconSummary,
      "",
      `Available tools (use ONLY names from this exact list in the "tools" arrays): ${availableTools}`,
      "",
      "Return ONLY a JSON object with this exact shape:",
      '{"reasoningSummary":"short summary of the main planning logic and prioritization","data":{"phases":[{"id":"phase-1","name":"Web App Scanning","priority":"high","rationale":"HTTP service found","targetService":"port 80 http","tools":["nikto","nuclei"],"status":"pending"}],"overallRisk":"high","summary":"Brief risk assessment"}}',
      "Include 3-6 phases. priorities: critical/high/medium/low. Status always 'pending'. Pick 1-3 tools per phase from the available tools list above."
    ].join("\n"));
    emitReasoning("planning", "Planning reasoning", envelope.reasoningSummary);
    const parsed = envelope.data;
    return {
      phases: Array.isArray(parsed.phases) ? parsed.phases.map((phase) => ({ ...phase, status: "pending" as const })) : [],
      overallRisk: (parsed.overallRisk as AttackPlan["overallRisk"]) ?? "medium",
      summary: parsed.summary ?? "Attack plan generated from recon data."
    };
  }

  private async executePhase(
    targetUrl: string,
    phase: AttackPlanPhase,
    recon: ReconResult,
    runId: string,
    provider: StoredAiProvider,
    model: string,
    emitReasoning: (phase: string, title: string, summary: string) => void,
    recordToolActivity: (activity: ExecutionReportToolActivity) => Promise<void>,
    updateToolActivity: (id: string, patch: Partial<ExecutionReportToolActivity>) => Promise<void>
  ): Promise<{
    findings: { title: string; severity: string; description: string; vector: string; rawEvidence?: string }[];
    probeCommand: string;
    probeOutput: string;
    toolAttempts: SuggestedToolAttempt[];
  }> {
    const toolAttempts = await this.executeSuggestedTools(targetUrl, phase, runId, recordToolActivity, updateToolActivity);
    const probeCommand = toolAttempts.map((attempt) => attempt.commandPreview).join("\n");
    const probeOutput = toolAttempts
      .map((attempt) => `[${attempt.toolName}]\n${attempt.output.trim()}`)
      .join("\n\n")
      .slice(0, 4000);

    const allObservations = toolAttempts.flatMap((attempt) => attempt.observations);
    const observationSummary = allObservations.length > 0
      ? allObservations
          .slice(0, 10)
          .map((obs) => `[${(obs.severity ?? "info").toUpperCase()}] ${obs.title}: ${obs.summary}`)
          .join("\n")
      : "";

    const envelope = await this.callStructuredDecisionModel<{
      findings: { title: string; severity: string; description: string; vector: string; rawEvidence?: string }[];
    }>(provider, model, [
      `You are a penetration tester analyzing results for the "${phase.name}" phase against ${targetUrl}.`,
      "",
      "Tool output:",
      probeOutput.slice(0, 2000),
      ...(observationSummary ? ["", "Structured observations from tools:", observationSummary] : []),
      "",
      "Recon context:",
      JSON.stringify({ technologies: recon.technologies, ports: recon.openPorts.slice(0, 5) }),
      "",
      "Identify 0-3 realistic security findings. Return ONLY JSON object:",
      '{"reasoningSummary":"short summary of why the evidence does or does not justify findings","data":{"findings":[{"title":"Finding name","severity":"high","description":"What was found and why it matters","vector":"The attack technique","rawEvidence":"relevant excerpt from probe output"}]}}',
      "Use severity: info/low/medium/high/critical. Return [] if nothing notable found."
    ].join("\n"));
    emitReasoning("execution", `Execution reasoning · ${phase.name}`, envelope.reasoningSummary);
    return {
      findings: Array.isArray(envelope.data.findings) ? envelope.data.findings.slice(0, 3) : [],
      probeCommand,
      probeOutput,
      toolAttempts
    };
  }

  private async executeSuggestedTools(
    targetUrl: string,
    phase: AttackPlanPhase,
    runId: string,
    recordToolActivity: (activity: ExecutionReportToolActivity) => Promise<void> = async () => undefined,
    updateToolActivity: (id: string, patch: Partial<ExecutionReportToolActivity>) => Promise<void> = async () => undefined
  ): Promise<SuggestedToolAttempt[]> {
    const emit = (message: string) => this.stream.publish(runId, { type: "log", level: "info", message });
    const resolvedTools = await this.resolvePlannedTools(phase);
    const parsedTargetUrl = new URL(targetUrl);
    const targetHost = parsedTargetUrl.hostname;

    const attempts: SuggestedToolAttempt[] = [];
    for (const { requestedName, tool } of resolvedTools) {
      emit(`Trying AI tool ${tool.name} for ${phase.name}`);
      const startedAt = new Date().toISOString();
      let activityId: string | null = null;
      try {
        const request = compileToolRequestFromDefinition(tool, {
          target: targetHost,
          layer: "L7",
          justification: `Attack map phase ${phase.name} requested ${tool.name}.`,
          toolInput: {
            baseUrl: targetUrl,
            target: targetHost,
            url: targetUrl
          }
        });
        const commandPreview = typeof request.parameters["commandPreview"] === "string"
          ? request.parameters["commandPreview"]
          : tool.name;
        const toolRun = createToolRun(runId, phase, tool, startedAt, commandPreview, request.target);
        activityId = randomUUID();
        await recordToolActivity(executionReportToolActivitySchema.parse({
          id: activityId,
          executionId: runId,
          executionKind: "attack-map",
          phase: phase.name,
          toolId: tool.id,
          toolName: tool.name,
          command: commandPreview,
          status: "running",
          outputPreview: null,
          exitCode: null,
          startedAt,
          completedAt: null
        }));
        this.stream.publish(runId, {
          type: "tool_started",
          phase: phase.name,
          toolId: tool.id,
          toolName: tool.name,
          command: commandPreview,
          startedAt
        });
        const result = await executeScriptedTool({
          scanId: runId,
          tacticId: phase.id,
          toolRun,
          request
        });
        const completedAt = new Date().toISOString();
        const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
        this.stream.publish(runId, {
          type: "tool_completed",
          phase: phase.name,
          toolId: tool.id,
          toolName: tool.name,
          command: result.commandPreview ?? toolRun.commandPreview,
          startedAt,
          completedAt,
          durationMs,
          exitCode: result.exitCode,
          outputPreview: result.output.slice(0, 600)
        });
        await updateToolActivity(activityId, {
          status: "completed",
          outputPreview: result.output.slice(0, 600),
          exitCode: result.exitCode,
          completedAt
        });
        attempts.push({
          toolId: tool.id,
          toolRunId: toolRun.id,
          toolName: tool.name,
          commandPreview: result.commandPreview ?? toolRun.commandPreview,
          output: result.output,
          observations: result.observations,
          exitCode: result.exitCode,
          statusReason: result.statusReason ?? null
        });
      } catch (error) {
        const message = errorMessage(error);
        const completedAt = new Date().toISOString();
        const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
        const commandPreview = `${requestedName} ${targetUrl}`;
        if (activityId) {
          await updateToolActivity(activityId, {
            status: "failed",
            outputPreview: message.slice(0, 600),
            exitCode: 1,
            completedAt
          });
        } else {
          await recordToolActivity(executionReportToolActivitySchema.parse({
            id: randomUUID(),
            executionId: runId,
            executionKind: "attack-map",
            phase: phase.name,
            toolId: tool.id,
            toolName: tool.name,
            command: commandPreview,
            status: "failed",
            outputPreview: message.slice(0, 600),
            exitCode: 1,
            startedAt,
            completedAt
          }));
        }
        this.stream.publish(runId, {
          type: "tool_completed",
          phase: phase.name,
          toolId: tool.id,
          toolName: tool.name,
          command: commandPreview,
          startedAt,
          completedAt,
          durationMs,
          exitCode: 1,
          outputPreview: message.slice(0, 600)
        });
        this.stream.publish(runId, {
          type: "log",
          level: "error",
          message: `Tool ${tool.name} failed for "${phase.name}": ${message}`
        });
        throw new RequestError(500, `Attack map phase "${phase.name}" failed while executing ${tool.name}: ${message}`, {
          code: "ORCHESTRATOR_TOOL_EXECUTION_FAILED",
          userFriendlyMessage: `Attack map execution failed for ${tool.name}.`,
          cause: error instanceof Error ? error : undefined
        });
      }
    }

    return attempts;
  }

  private async deepDiveFinding(
    targetUrl: string,
    finding: AttackMapNode,
    siblingFindings: AttackMapNode[],
    recon: ReconResult,
    provider: StoredAiProvider,
    model: string,
    emitReasoning: (phase: string, title: string, summary: string) => void
  ): Promise<AttackMapNode[]> {
    const contextSummary = siblingFindings
      .filter((node) => node.id !== finding.id)
      .slice(0, 5)
      .map((node) => `- ${node.label} (${node.severity ?? "info"})`)
      .join("\n");

    const envelope = await this.callStructuredDecisionModel<{
      findings: { title: string; severity: string; description: string; vector: string }[];
    }>(provider, model, [
      "You are a penetration tester performing deep analysis on a confirmed vulnerability.",
      `Target: ${targetUrl}`,
      "",
      "Confirmed finding:",
      `  Title: ${finding.label}`,
      `  Severity: ${finding.severity ?? "unknown"}`,
      `  Description: ${String(finding.data["description"] ?? "")}`,
      `  Vector: ${String(finding.data["vector"] ?? "")}`,
      "",
      "Other known findings in scope:",
      contextSummary || "  (none yet)",
      "",
      "Technologies / ports:",
      `  ${recon.technologies.join(", ")} | ports: ${recon.openPorts.map((port) => `${port.port}/${port.service}`).join(", ")}`,
      "",
      "Question: From THIS specific vulnerability as a foothold, what 0-2 deeper or adjacent vulnerabilities can be reached or confirmed? Focus on concrete exploitation paths, lateral movement, or privilege escalation from this entry point.",
      "",
      "Return ONLY a JSON object:",
      '{"reasoningSummary":"short summary of the exploitation path or why no deeper path is justified","data":{"findings":[{"title":"...","severity":"critical|high|medium|low|info","description":"...","vector":"..."}]}}',
      "Return [] if no deeper paths are meaningful."
    ].join("\n"));
    emitReasoning("deep_analysis", `Deep analysis reasoning · ${finding.label}`, envelope.reasoningSummary);
    const parsed = envelope.data.findings;
    if (!Array.isArray(parsed)) {
      throw new Error(`Selected AI provider returned an invalid deep analysis payload for ${finding.label}.`);
    }
    return parsed.slice(0, 2).map((candidate) => ({
      id: randomUUID(),
      type: "finding" as const,
      label: candidate.title,
      status: "vulnerable" as const,
      severity: (["critical", "high", "medium", "low", "info"].includes(candidate.severity) ? candidate.severity : "medium") as Severity,
      parentId: finding.id,
      data: {
        description: candidate.description,
        vector: candidate.vector,
        sourceType: "ai",
        source: `Deep analysis of: ${finding.label} via ${provider.name}`,
        command: `AI-guided deep analysis (${provider.name}:${model})`,
        rawOutput: `Derived from: ${finding.label}\n\nVector: ${candidate.vector}`
      }
    }));
  }

  private async correlateAttackChains(
    allFindings: AttackMapNode[],
    targetUrl: string,
    provider: StoredAiProvider,
    model: string,
    emitReasoning: (phase: string, title: string, summary: string) => void
  ): Promise<{ title: string; description: string; severity: Severity; findingIds: string[]; exploitation: string; impact: string }[]> {
    const findingsSummary = allFindings.map((finding) =>
      `id:${finding.id} | severity:${finding.severity ?? "info"} | title:${finding.label} | desc:${String(finding.data["description"] ?? "").slice(0, 120)}`
    ).join("\n");

    const envelope = await this.callStructuredDecisionModel<{
      chains: {
        title: string;
        description: string;
        severity: string;
        findingIds: string[];
        exploitation: string;
        impact: string;
      }[];
    }>(provider, model, [
      `You are a senior penetration tester identifying sophisticated attack chains for: ${targetUrl}`,
      "",
      "All confirmed findings:",
      findingsSummary,
      "",
      "Identify 0-3 attack chains where 2+ findings can be COMBINED for a more sophisticated or higher-impact attack.",
      "A chain is NOT just listing findings — it must describe HOW one vulnerability enables or amplifies another.",
      "",
      "Return ONLY a JSON object:",
      '{"reasoningSummary":"short summary of why the findings do or do not chain together","data":{"chains":[{"title":"...","description":"How these connect","severity":"critical|high|medium","findingIds":["id1","id2"],"exploitation":"Step-by-step chained attack","impact":"What the attacker ultimately achieves"}]}}',
      "Use exact finding IDs from the list above. Return [] if no meaningful chains exist."
    ].join("\n"));
    emitReasoning("correlation", "Correlation reasoning", envelope.reasoningSummary);
    const parsed = envelope.data.chains;
    if (!Array.isArray(parsed)) {
      throw new Error("Selected AI provider returned an invalid attack chain correlation payload.");
    }

    return parsed.slice(0, 3)
      .filter((chain) => Array.isArray(chain.findingIds) && chain.findingIds.length >= 2)
      .map((chain) => ({
        title: chain.title,
        description: chain.description,
        severity: (["critical", "high", "medium", "low", "info"].includes(chain.severity) ? chain.severity : "high") as Severity,
        findingIds: chain.findingIds.filter((findingId) => allFindings.some((finding) => finding.id === findingId)),
        exploitation: chain.exploitation,
        impact: chain.impact
      }))
      .filter((chain) => chain.findingIds.length >= 2);
  }

  private assertProviderSupportsOrchestration(provider: StoredAiProvider | null): asserts provider is StoredAiProvider {
    if (!provider) {
      throw new RequestError(400, "Attack map provider not found.");
    }

    if (provider.kind === "anthropic" && !provider.apiKey) {
      throw new RequestError(400, "Attack map runs require an Anthropic API key when the selected provider is Anthropic.");
    }

    if (provider.kind === "local" && !provider.baseUrl) {
      throw new RequestError(400, "Attack map runs require a base URL when the selected provider is local.");
    }
  }

  private createAnthropicLanguageModel(provider: StoredAiProvider, model: string) {
    const anthropic = createAnthropic({
      ...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
      ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {})
    });

    return anthropic(model);
  }

  private async callDecisionModel(provider: StoredAiProvider, model: string, prompt: string) {
    if (provider.kind === "local") {
      return this.callLocalDecisionModel(provider, model, prompt);
    }

    return this.callHostedDecisionModel(provider, model, prompt);
  }

  private async callStructuredDecisionModel<T>(provider: StoredAiProvider, model: string, prompt: string): Promise<DecisionEnvelope<T>> {
    const text = await this.callDecisionModel(provider, model, prompt);
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Selected AI provider returned structured reasoning output without a JSON object.");
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<DecisionEnvelope<T>>;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Selected AI provider returned an invalid structured reasoning payload.");
    }

    return {
      reasoningSummary: typeof parsed.reasoningSummary === "string" && parsed.reasoningSummary.trim()
        ? parsed.reasoningSummary.trim()
        : "No reasoning summary provided.",
      data: parsed.data as T
    };
  }

  private async callHostedDecisionModel(provider: StoredAiProvider, model: string, prompt: string) {
    const result = await generateText({
      model: this.createAnthropicLanguageModel(provider, model),
      prompt
    });

    const content = result.text.trim();
    if (!content) {
      throw new Error("Hosted provider returned an empty attack-map response.");
    }

    return content;
  }

  private async callLocalDecisionModel(provider: StoredAiProvider, model: string, prompt: string) {
    const baseUrl = provider.baseUrl;
    if (!baseUrl) {
      throw new Error("Local attack-map execution requires a provider base URL.");
    }

    const response = await fetch(new URL("/api/chat", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: {
          temperature: 0
        },
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Local provider request failed with status ${response.status}.`);
    }

    const payload = await response.json() as { message?: { content?: string } };
    const content = payload.message?.content?.trim();
    if (!content) {
      throw new Error("Local provider returned an empty attack-map response.");
    }

    return content;
  }
}
