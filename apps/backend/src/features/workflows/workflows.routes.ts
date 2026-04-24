import {
  apiRoutes,
  createWorkflowBodySchema,
  listWorkflowsResponseSchema,
  singleAgentScanCoverageResponseSchema,
  singleAgentScanReportSchema,
  singleAgentScanTraceResponseSchema,
  singleAgentScanVulnerabilitiesResponseSchema,
  workflowRunStreamMessageSchema,
  workflowRunSchema,
  workflowSchema,
  workflowsListQuerySchema,
  updateWorkflowBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import {
  getRunCoverage,
  getRunReport,
  getRunTrace,
  getRunVulnerabilities
} from "@/features/scans/scan-results.js";
import type { WorkflowsRepository } from "./workflows.repository.js";
import { WorkflowExecutionService } from "./workflow-execution.service.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

function writeSseMessage(response: { write: (chunk: string) => void }, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function registerWorkflowsRoutes(
  app: Express,
  repository: WorkflowsRepository,
  executionService: WorkflowExecutionService,
  workflowRunStream: WorkflowRunStream
) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.workflows,
    repository,
    querySchema: workflowsListQuerySchema,
    listResponseSchema: listWorkflowsResponseSchema,
    listDataKey: "workflows",
    itemSchema: workflowSchema,
    createBodySchema: createWorkflowBodySchema,
    updateBodySchema: updateWorkflowBodySchema,
    notFoundMessage: "Workflow not found."
  });

  app.post(`${apiRoutes.workflows}/:id/runs`, async (request, response, next) => {
    try {
      const run = await executionService.startRun(request.params.id);
      response.status(201).json(workflowRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflows}/:id/runs/latest`, async (request, response, next) => {
    try {
      const workflow = await repository.getById(request.params.id);
      if (!workflow) {
        response.status(404).json({ message: "Workflow not found." });
        return;
      }

      const run = await repository.getLatestRunByWorkflowId(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      response.json(workflowRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      response.json(workflowRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/vulnerabilities`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      response.json(singleAgentScanVulnerabilitiesResponseSchema.parse({
        scanId: run.id,
        vulnerabilities: await getRunVulnerabilities(run.id)
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/coverage`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      response.json(singleAgentScanCoverageResponseSchema.parse({
        scanId: run.id,
        layers: await getRunCoverage(run.id)
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/trace`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      response.json(singleAgentScanTraceResponseSchema.parse({
        scanId: run.id,
        entries: await getRunTrace(run.id)
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/report`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      const report = await getRunReport(run.id);
      if (!report) {
        response.status(404).json({ message: "Workflow run report not found." });
        return;
      }

      response.json(singleAgentScanReportSchema.parse(report));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/events`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        response.status(404).json({ message: "Workflow run not found." });
        return;
      }

      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.flushHeaders?.();

      writeSseMessage(response, workflowRunStreamMessageSchema.parse({
        type: "snapshot",
        run
      }));

      const unsubscribe = workflowRunStream.subscribe(run.id, (message) => {
        writeSseMessage(response, workflowRunStreamMessageSchema.parse(message));
      });

      const heartbeat = setInterval(() => {
        response.write(": keepalive\n\n");
      }, 15000);

      request.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(`${apiRoutes.workflowRuns}/:id/step`, async (request, response, next) => {
    try {
      const run = await executionService.stepRun(request.params.id);
      response.json(workflowRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });
}
