import { randomUUID } from "crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { createScanRequestSchema } from "@synosec/contracts";
import type { Scan, WsEvent } from "@synosec/contracts";

// Typed route param helper
type IdParam = { id: string };
type ReqWithId = Request<IdParam>;
import {
  createScan,
  getAuditForScan,
  getFindingsForScan,
  getGraphForScan,
  getScan,
  listScans
} from "../db/neo4j.js";
import { Orchestrator } from "../orchestrator/orchestrator.js";
import { reportStore, seedDemoScan } from "../seed/demo-data.js";

// ---------------------------------------------------------------------------
// Active orchestrators — keyed by scanId
// ---------------------------------------------------------------------------

const activeOrchestrators = new Map<string, Orchestrator>();

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createScanRouter(broadcast: (event: WsEvent) => void): Router {
  const router = Router();

  // POST /api/scan — create + start scan
  router.post("/api/scan", async (req: Request, res: Response) => {
    const parsed = createScanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      return;
    }

    const scan: Scan = {
      id: randomUUID(),
      scope: parsed.data.scope,
      status: "pending",
      currentRound: 0,
      nodesTotal: 0,
      nodesComplete: 0,
      createdAt: new Date().toISOString()
    };

    await createScan(scan);

    const orchestrator = new Orchestrator(broadcast);
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
    const scans = await listScans();
    res.json(scans);
  });

  // GET /api/scan/seed — must come before /api/scan/:id to avoid route conflict
  router.post("/api/scan/seed", async (_req: Request, res: Response) => {
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
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const graph = await getGraphForScan(id);
    res.json(graph);
  });

  // GET /api/scan/:id/report
  router.get("/api/scan/:id/report", async (req: ReqWithId, res: Response) => {
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
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing scan id" });
      return;
    }

    const audit = await getAuditForScan(id);
    res.json(audit);
  });

  return router;
}

// Export report store so orchestrator can write to it
export { reportStore as scanReportStore };
