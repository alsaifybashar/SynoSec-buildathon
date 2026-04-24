import { type Express } from "express";
import { z } from "zod";
import type { OrchestratorEventStream, OrchestratorExecutionEngine } from "@/execution-engine/contracts.js";

const createRunBodySchema = z.object({
  targetUrl: z.string().url().min(1),
  providerId: z.string().uuid()
});

function writeSse(res: { write: (chunk: string) => void }, event: unknown) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function registerOrchestratorRoutes(
  app: Express,
  service: OrchestratorExecutionEngine,
  stream: OrchestratorEventStream
) {
  // List runs
  app.get("/api/orchestrator/runs", async (_req, res, next) => {
    try {
      const runs = await service.listRuns();
      res.json({ runs });
    } catch (error) {
      next(error);
    }
  });

  // Get single run
  app.get("/api/orchestrator/runs/:id", async (req, res, next) => {
    try {
      const run = await service.getRun(req.params.id);
      if (!run) {
        res.status(404).json({ message: "Orchestrator run not found." });
        return;
      }
      res.json(run);
    } catch (error) {
      next(error);
    }
  });

  // Create + start run
  app.post("/api/orchestrator/runs", async (req, res, next) => {
    try {
      const body = createRunBodySchema.parse(req.body);
      const run = await service.createRun(body.targetUrl, body.providerId);
      service.startAsync(run.id, body.targetUrl, body.providerId);
      res.status(201).json(run);
    } catch (error) {
      next(error);
    }
  });

  // SSE event stream for a run
  app.get("/api/orchestrator/runs/:id/events", async (req, res, next) => {
    try {
      const run = await service.getRun(req.params.id);
      if (!run) {
        res.status(404).json({ message: "Orchestrator run not found." });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // Send current state immediately
      writeSse(res, { type: "snapshot", run });

      const unsub = stream.subscribe(req.params.id, (event) => {
        writeSse(res, event);
        if (event.type === "completed" || event.type === "failed") {
          res.end();
        }
      });

      req.on("close", unsub);
    } catch (error) {
      next(error);
    }
  });
}
