import {
  apiRoutes,
  connectorExecutionResultSchema,
  connectorRegistrationRequestSchema,
  connectorTestDispatchRequestSchema,
  type Scan
} from "@synosec/contracts";
import { Router, type Request, type Response } from "express";
import { assertConnectorAuth } from "@/integrations/connectors/auth.js";
import { connectorControlPlane } from "@/integrations/connectors/control-plane.js";
import { ToolBroker } from "@/features/workflows/engine/broker/tool-broker.js";
import { ensureScanRecord } from "@/features/scans/scan-records.js";

function getSinglePathParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  return null;
}

export function createConnectorsRouter(): Router {
  const router = Router();

  router.post(apiRoutes.connectorRegister, (req: Request, res: Response, next) => {
    try {
      assertConnectorAuth(req);
      const input = connectorRegistrationRequestSchema.parse(req.body);
      const payload = connectorControlPlane.register(input);
      res.status(201).json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post(apiRoutes.connectorPoll, (req: Request, res: Response, next) => {
    try {
      assertConnectorAuth(req);
      const connectorId = getSinglePathParam(req.params["connectorId"]);
      if (!connectorId) {
        res.status(400).json({ error: "missing_connector_id" });
        return;
      }
      const job = connectorControlPlane.pollNext(connectorId);
      res.json({
        connectorId,
        ...(job ? { job } : {})
      });
    } catch (error) {
      next(error);
    }
  });

  router.post(apiRoutes.connectorHeartbeat, (req: Request, res: Response, next) => {
    try {
      assertConnectorAuth(req);
      const connectorId = getSinglePathParam(req.params["connectorId"]);
      const jobId = getSinglePathParam(req.params["jobId"]);
      if (!connectorId || !jobId) {
        res.status(400).json({ error: "missing_path_params" });
        return;
      }
      const heartbeat = connectorControlPlane.heartbeat(connectorId, jobId);
      res.json({
        ok: true,
        connectorId,
        jobId,
        leaseExpiresAt: heartbeat.leaseExpiresAt
      });
    } catch (error) {
      next(error);
    }
  });

  router.post(apiRoutes.connectorResult, (req: Request, res: Response, next) => {
    try {
      assertConnectorAuth(req);
      const connectorId = getSinglePathParam(req.params["connectorId"]);
      const jobId = getSinglePathParam(req.params["jobId"]);
      if (!connectorId || !jobId) {
        res.status(400).json({ error: "missing_path_params" });
        return;
      }
      const result = connectorExecutionResultSchema.parse(req.body);
      const resolution = connectorControlPlane.complete(connectorId, jobId, result);
      res.status(202).json({
        ok: true,
        connectorId: resolution.connectorId,
        jobId,
        leaseExpiresAt: resolution.leaseExpiresAt
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(apiRoutes.connectorStatus, (req: Request, res: Response, next) => {
    try {
      assertConnectorAuth(req);
      res.json(connectorControlPlane.getStatus());
    } catch (error) {
      next(error);
    }
  });

  router.post(apiRoutes.connectorTestDispatch, async (req: Request, res: Response, next) => {
    try {
      const input = connectorTestDispatchRequestSchema.parse(req.body);
      const scan: Scan = {
        id: input.scanId,
        scope: input.scope,
        status: "running",
        currentRound: 0,
        tacticsTotal: 1,
        tacticsComplete: 0,
        createdAt: new Date().toISOString()
      };

      await ensureScanRecord(scan);

      const broker = new ToolBroker({ broadcast: () => undefined });
      const result = await broker.executeRequests({
        scan,
        tacticId: input.tacticId,
        agentId: input.agentId,
        requests: [input.request]
      });

      res.status(202).json({
        toolRuns: result.toolRuns,
        observations: result.observations,
        findings: result.findings,
        dispatchMode: result.toolRuns[0]?.dispatchMode ?? "local"
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
