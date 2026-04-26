import { type Express } from "express";
import { z } from "zod";
import { orchestratorStreamMessageSchema } from "@synosec/contracts";
import type { OrchestratorEventStream, OrchestratorExecutionEngine } from "@/engine/contracts.js";

const createRunBodySchema = z.object({
  targetUrl: z.string().url().min(1)
});

function writeSse(res: { write: (chunk: string) => void }, event: unknown) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function registerOrchestratorRoutes(
  app: Express,
  service: OrchestratorExecutionEngine,
  stream: OrchestratorEventStream
) {
  app.get("/api/orchestrator/runs", async (_req, res, next) => {
    try {
      const runs = await service.listRuns();
      res.json({ runs });
    } catch (error) {
      next(error);
    }
  });

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

  app.post("/api/orchestrator/runs", async (req, res, next) => {
    try {
      const body = createRunBodySchema.parse(req.body);
      const run = await service.createRun(body.targetUrl);
      service.startAsync(run.id);
      res.status(201).json(run);
    } catch (error) {
      next(error);
    }
  });

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

      writeSse(res, orchestratorStreamMessageSchema.parse({ type: "snapshot", run }));

      const unsub = stream.subscribe(req.params.id, (message) => {
        const payload = orchestratorStreamMessageSchema.parse(message);
        writeSse(res, payload);
        if (payload.type === "run_event" && (payload.event?.type === "completed" || payload.event?.type === "failed")) {
          res.end();
        }
      });

      req.on("close", unsub);
    } catch (error) {
      next(error);
    }
  });
}
