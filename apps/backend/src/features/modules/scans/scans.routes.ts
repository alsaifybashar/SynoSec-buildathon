import {
  apiRoutes,
  createSingleAgentScanRequestSchema,
  listSingleAgentScansResponseSchema,
  singleAgentScanCoverageResponseSchema,
  singleAgentScanReportSchema,
  singleAgentScanSchema,
  singleAgentScansListQuerySchema,
  singleAgentScanTraceResponseSchema,
  singleAgentScanVulnerabilitiesResponseSchema
} from "@synosec/contracts";
import { type Express } from "express";
import { handlePaginatedListRoute } from "@/core/http/paginated-list-route.js";
import {
  getAuditForScan,
  getLayerCoverageForScan,
  getSecurityVulnerabilitiesForScan,
  getSingleAgentScan,
  getSingleAgentScanReport,
  listSingleAgentScans
} from "@/platform/db/scan-store.js";
import { SingleAgentScanService } from "./single-agent-scan.service.js";

export function registerScansRoutes(app: Express, service: SingleAgentScanService) {
  app.get(apiRoutes.singleAgentScans, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: singleAgentScansListQuerySchema,
      responseSchema: listSingleAgentScansResponseSchema,
      dataKey: "scans",
      load: async (query) => listSingleAgentScans({
        page: query.page,
        pageSize: query.pageSize,
        sortDirection: query.sortDirection,
        ...(query.status ? { status: query.status } : {}),
        ...(query.applicationId ? { applicationId: query.applicationId } : {}),
        ...(query.agentId ? { agentId: query.agentId } : {})
      })
    });
  });

  app.post(apiRoutes.singleAgentScans, async (request, response, next) => {
    try {
      const input = createSingleAgentScanRequestSchema.parse(request.body);
      const scan = await service.createAndRunScan(input);
      response.status(201).json(singleAgentScanSchema.parse(scan));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.singleAgentScans}/:id`, async (request, response, next) => {
    try {
      const scan = await getSingleAgentScan(request.params.id);
      if (!scan) {
        response.status(404).json({ message: "Single-agent scan not found." });
        return;
      }

      response.json(singleAgentScanSchema.parse(scan));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.singleAgentScans}/:id/vulnerabilities`, async (request, response, next) => {
    try {
      const scan = await getSingleAgentScan(request.params.id);
      if (!scan) {
        response.status(404).json({ message: "Single-agent scan not found." });
        return;
      }

      response.json(singleAgentScanVulnerabilitiesResponseSchema.parse({
        scanId: scan.id,
        vulnerabilities: await getSecurityVulnerabilitiesForScan(scan.id)
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.singleAgentScans}/:id/coverage`, async (request, response, next) => {
    try {
      const scan = await getSingleAgentScan(request.params.id);
      if (!scan) {
        response.status(404).json({ message: "Single-agent scan not found." });
        return;
      }

      response.json(singleAgentScanCoverageResponseSchema.parse({
        scanId: scan.id,
        layers: await getLayerCoverageForScan(scan.id)
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.singleAgentScans}/:id/trace`, async (request, response, next) => {
    try {
      const scan = await getSingleAgentScan(request.params.id);
      if (!scan) {
        response.status(404).json({ message: "Single-agent scan not found." });
        return;
      }

      response.json(singleAgentScanTraceResponseSchema.parse({
        scanId: scan.id,
        entries: await getAuditForScan(scan.id)
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.singleAgentScans}/:id/report`, async (request, response, next) => {
    try {
      const report = await getSingleAgentScanReport(request.params.id);
      if (!report) {
        response.status(404).json({ message: "Single-agent scan not found." });
        return;
      }

      response.json(singleAgentScanReportSchema.parse(report));
    } catch (error) {
      next(error);
    }
  });
}
