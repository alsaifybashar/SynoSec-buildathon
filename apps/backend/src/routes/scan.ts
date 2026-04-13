import { randomUUID } from "crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { createScanRequestSchema } from "@synosec/contracts";
import type { AuditEntry, EvidenceResponse, Scan, ToolAdapter, ToolRun, ToolRiskTier, WsEvent } from "@synosec/contracts";

// Typed route param helper
type IdParam = { id: string };
type ReqWithId = Request<IdParam>;
import {
  createScan,
  ensureNeo4jAvailable,
  getAuditForScan,
  getFindingsForScan,
  getGraphForScan,
  getScan,
  getVulnerabilityChains,
  getAttackSurfaceClusters,
  listScans
} from "../db/neo4j.js";
import { Orchestrator } from "../orchestrator/orchestrator.js";
import { normalizeScopeForRun } from "../orchestrator/execution-policy.js";
import { evidenceStore } from "../broker/evidence-store.js";
import { reportStore } from "../runtime/report-store.js";
import { seedDemoScan } from "../seed/demo-data.js";
import { parseScanTarget } from "../tools/scan-tools.js";

// ---------------------------------------------------------------------------
// Active orchestrators — keyed by scanId
// ---------------------------------------------------------------------------

const activeOrchestrators = new Map<string, Orchestrator>();

const neo4jUnavailableMessage =
  "Neo4j is not available. Start the Neo4j service or configure NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD correctly.";

const knownToolAdapters = new Set<ToolAdapter>([
  "network_scan",
  "service_scan",
  "session_audit",
  "tls_audit",
  "http_probe",
  "web_fingerprint",
  "db_injection_check",
  "content_discovery",
  "nikto_scan",
  "nuclei_scan",
  "vuln_check"
]);

const knownRiskTiers = new Set<ToolRiskTier>(["passive", "active", "controlled-exploit"]);

function buildCommandPreview(toolRun: Pick<ToolRun, "adapter" | "tool" | "target" | "port">): string {
  const parsedTarget = parseScanTarget(toolRun.target);
  const host = parsedTarget.host;
  const port = toolRun.port ?? parsedTarget.port;
  const scheme = parsedTarget.scheme ?? (port === 443 || port === 8443 ? "https" : "http");
  const baseUrl = `${scheme}://${host}${port ? `:${port}` : ""}`;

  switch (toolRun.adapter) {
    case "network_scan":
      return `nmap -sn ${host}`;
    case "service_scan":
      return `nmap -sV ${host}${port ? ` -p ${port}` : ""}`;
    case "session_audit":
      return toolRun.tool === "smbclient"
        ? `smbclient -L ${host} -N`
        : `ssh-audit ${host}`;
    case "tls_audit":
      return `sslscan ${host}:${port ?? 443}`;
    case "http_probe":
      return `curl -I ${baseUrl}`;
    case "web_fingerprint":
      return `whatweb ${baseUrl}`;
    case "db_injection_check":
      return `sqlmap -u ${baseUrl}/ --batch`;
    case "content_discovery":
      return `ffuf -u ${baseUrl}/FUZZ`;
    case "nikto_scan":
      return `nikto -host ${host}${port ? ` -port ${port}` : ""}`;
    case "nuclei_scan":
      return `nuclei -target ${baseUrl} -t default-templates`;
    case "vuln_check":
      return `synosec-vuln-check --target ${baseUrl}`;
    default:
      return `${toolRun.tool} ${host}${port ? `:${port}` : ""}`;
  }
}

function synthesizeToolRunsFromAudit(scanId: string, auditEntries: AuditEntry[], scanStatus?: Scan["status"]): ToolRun[] {
  const synthesized = new Map<string, ToolRun>();

  for (const entry of auditEntries) {
    if (
      entry.action !== "tool-run-authorized"
      && entry.action !== "tool-run-denied"
      && entry.action !== "tool-run-failed"
    ) {
      continue;
    }

    const rawAdapter = typeof entry.details["adapter"] === "string" ? entry.details["adapter"] : undefined;
    const tool = typeof entry.details["tool"] === "string" ? entry.details["tool"] : undefined;
    const target = typeof entry.details["target"] === "string" ? entry.details["target"] : undefined;
    const adapter = rawAdapter && knownToolAdapters.has(rawAdapter as ToolAdapter)
      ? rawAdapter as ToolAdapter
      : undefined;
    if (!adapter || !tool || !target) {
      continue;
    }

    const rawRiskTier = typeof entry.details["riskTier"] === "string" ? entry.details["riskTier"] : "passive";
    const riskTier = knownRiskTiers.has(rawRiskTier as ToolRiskTier)
      ? rawRiskTier as ToolRiskTier
      : "passive";
    const statusReason = typeof entry.details["reason"] === "string"
      ? entry.details["reason"]
      : typeof entry.details["error"] === "string"
        ? entry.details["error"]
        : undefined;
    const toolRunId = typeof entry.details["toolRunId"] === "string"
      ? entry.details["toolRunId"]
      : `${entry.targetNodeId ?? "node"}:${adapter}:${tool}:${target}`;
    const existing = synthesized.get(toolRunId);
    const base: ToolRun = existing ?? {
      id: toolRunId,
      scanId,
      nodeId: entry.targetNodeId ?? "unknown-node",
      agentId: entry.actor,
      adapter,
      tool,
      target,
      status: "running",
      riskTier,
      justification: statusReason ?? "Recovered from audit trail.",
      commandPreview: buildCommandPreview({
        adapter,
        tool,
        target,
        ...(typeof entry.details["port"] === "number" ? { port: entry.details["port"] } : {})
      }),
      startedAt: entry.timestamp
    };

    if (entry.action === "tool-run-authorized") {
      synthesized.set(toolRunId, base);
      continue;
    }

    synthesized.set(toolRunId, {
      ...base,
      status: entry.action === "tool-run-denied" ? "denied" : "failed",
      completedAt: entry.timestamp,
      ...(statusReason ? { statusReason } : {}),
      ...(entry.action === "tool-run-failed"
        ? {
            output: [
              "Recovered from audit trail.",
              `adapter=${adapter}`,
              `tool=${tool}`,
              `target=${target}`,
              statusReason ?? "Unknown broker error"
            ].join("\n")
          }
        : {})
    });
  }

  const synthesizedRuns = [...synthesized.values()].map((toolRun) => {
    if (toolRun.status !== "running" && toolRun.status !== "pending") {
      return toolRun;
    }

    if (scanStatus !== "complete") {
      return toolRun;
    }

    return {
      ...toolRun,
      status: "completed" as const,
      completedAt: toolRun.startedAt,
      statusReason: "Recovered from audit trail after scan completion.",
      output: toolRun.output ?? "Recovered from audit trail after scan completion."
    };
  });

  return synthesizedRuns.sort((left, right) => left.startedAt.localeCompare(right.startedAt));
}

async function getToolRunsForScanWithAuditFallback(scanId: string): Promise<ToolRun[]> {
  const toolRuns = evidenceStore.getToolRunsForScan(scanId);
  if (toolRuns.length > 0) {
    return toolRuns;
  }

  const scan = await getScan(scanId);
  const auditEntries = await getAuditForScan(scanId);
  return synthesizeToolRunsFromAudit(scanId, auditEntries, scan?.status);
}

async function requireNeo4j(res: Response): Promise<boolean> {
  try {
    await ensureNeo4jAvailable();
    return true;
  } catch (error) {
    res.status(503).json({
      error: "Neo4j unavailable",
      message: error instanceof Error ? neo4jUnavailableMessage : neo4jUnavailableMessage
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createScanRouter(broadcast: (event: WsEvent) => void): Router {
  const router = Router();

  // POST /api/scan — create + start scan
  router.post("/api/scan", async (req: Request, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const parsed = createScanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      return;
    }

    const normalizedScope = normalizeScopeForRun(parsed.data.scope, parsed.data.llm);

    const scan: Scan = {
      id: randomUUID(),
      scope: normalizedScope,
      status: "pending",
      currentRound: 0,
      nodesTotal: 0,
      nodesComplete: 0,
      createdAt: new Date().toISOString()
    };

    await createScan(scan);

    const orchestrator = new Orchestrator(broadcast, parsed.data.llm);
    activeOrchestrators.set(scan.id, orchestrator);

    // Fire and forget — don't await
    orchestrator.run(scan).catch((err: unknown) => {
      console.error(`Orchestrator error for scan ${scan.id}:`, err instanceof Error ? err.message : err);
    }).finally(() => {
      activeOrchestrators.delete(scan.id);
    });

    res.status(201).json({ scanId: scan.id });
  });

  // GET /api/scans — list all scans
  router.get("/api/scans", async (_req: Request, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const scans = await listScans();
    res.json(scans);
  });

  // GET /api/scan/seed — must come before /api/scan/:id to avoid route conflict
  router.post("/api/scan/seed", async (_req: Request, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    try {
      const scanId = await seedDemoScan();
      res.status(201).json({ scanId });
    } catch (err: unknown) {
      console.error("Seed error:", err instanceof Error ? err.message : err);
      res.status(500).json({ error: "Seed failed", message: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // GET /api/scan/:id — get scan status
  router.get("/api/scan/:id", async (req: ReqWithId, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const scan = await getScan(id);
    if (!scan) {
      res.status(404).json({ error: "Scan not found" });
      return;
    }

    res.json(scan);
  });

  // GET /api/scan/:id/findings
  router.get("/api/scan/:id/findings", async (req: ReqWithId, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const findings = await getFindingsForScan(id);
    res.json(findings);
  });

  // GET /api/scan/:id/graph
  router.get("/api/scan/:id/graph", async (req: ReqWithId, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const graph = await getGraphForScan(id);
    res.json(graph);
  });

  // GET /api/scan/:id/chains — GRACE vulnerability chains
  router.get("/api/scan/:id/chains", async (req: ReqWithId, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const chains = await getVulnerabilityChains(id);
    res.json(chains);
  });

  // GET /api/scan/:id/report
  router.get("/api/scan/:id/report", async (req: ReqWithId, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    // Check in-memory store first (fast path)
    const cachedReport = reportStore.get(id);
    if (cachedReport) {
      res.json(cachedReport);
      return;
    }

    // Fallback: check if scan is complete and regenerate from DB
    const scan = await getScan(id);
    if (!scan) {
      res.status(404).json({ error: "Scan not found" });
      return;
    }
    if (scan.status !== "complete") {
      res.status(404).json({ error: "Report not available — scan not complete" });
      return;
    }

    // Re-generate report from DB (handles server restart scenario)
    try {
      const { generateReport } = await import("../orchestrator/report.js");
      const noopBroadcast = () => {};
      const report = await generateReport(id, noopBroadcast);
      reportStore.set(id, report);
      res.json(report);
    } catch (err: unknown) {
      console.error("On-demand report generation failed:", err instanceof Error ? err.message : err);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // POST /api/scan/:id/abort
  router.post("/api/scan/:id/abort", async (req: ReqWithId, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const orchestrator = activeOrchestrators.get(id);
    if (!orchestrator) {
      res.status(404).json({ error: "No active scan found with this id" });
      return;
    }

    await orchestrator.abort(id);
    res.json({ message: "Abort signal sent" });
  });

  // GET /api/scan/:id/audit
  router.get("/api/scan/:id/audit", async (req: ReqWithId, res: Response) => {
    if (!(await requireNeo4j(res))) {
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const audit = await getAuditForScan(id);
    res.json(audit);
  });

  router.get("/api/scan/:id/tool-runs", async (req: ReqWithId, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    res.json(await getToolRunsForScanWithAuditFallback(id));
  });

  router.get("/api/scan/:id/evidence", async (req: ReqWithId, res: Response) => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const clusters = await getAttackSurfaceClusters(id);
    const prioritizedTargets = clusters.slice(0, 3).map((c) => c.target);

    const payload: EvidenceResponse = {
      toolRuns: await getToolRunsForScanWithAuditFallback(id),
      observations: evidenceStore.getObservationsForScan(id),
      prioritizedTargets
    };
    res.json(payload);
  });

  return router;
}

// Export report store so orchestrator can write to it
export { reportStore as scanReportStore };
