import {
  apiRoutes,
  createWorkflowBodySchema,
  listWorkflowsResponseSchema,
  startWorkflowRunBodySchema,
  workflowLaunchSchema,
  workflowRunCoverageResponseSchema,
  workflowRunEvaluationResponseSchema,
  workflowRunFindingsResponseSchema,
  workflowRunReportSchema,
  type WorkflowRunStreamMessage,
  workflowRunStreamMessageSchema,
  workflowRunTranscriptResponseSchema,
  workflowRunSchema,
  workflowSchema,
  workflowsListQuerySchema,
  updateWorkflowBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { RequestError } from "@/shared/http/request-error.js";
import type { WorkflowExecutionEngine, WorkflowRunEventStream } from "@/engine/contracts.js";
import type { WorkflowArtifactReader } from "@/engine/workflow/index.js";
import type { WorkflowRunEvaluationService } from "@/modules/workflow-evals/index.js";
import type { WorkflowsRepository } from "./workflows.repository.js";

function writeSseMessage(response: { write: (chunk: string) => void }, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function registerWorkflowsRoutes(
  app: Express,
  repository: WorkflowsRepository,
  executionService: WorkflowExecutionEngine,
  workflowRunStream: WorkflowRunEventStream,
  workflowRunArtifactsService: WorkflowArtifactReader,
  workflowRunEvaluationService: WorkflowRunEvaluationService
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
      const run = await executionService.startRun(
        request.params.id,
        startWorkflowRunBodySchema.parse(request.body ?? {})
      );
      response.status(201).json(workflowLaunchSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflows}/:id/launches/latest`, async (request, response, next) => {
    try {
      const workflow = await repository.getById(request.params.id);
      if (!workflow) {
        throw new RequestError(404, "Workflow not found.", "NOT_FOUND");
      }

      const launch = await repository.getLatestLaunchByWorkflowId(request.params.id);
      if (!launch) {
        throw new RequestError(404, "Workflow launch not found.", "NOT_FOUND");
      }

      response.json(workflowLaunchSchema.parse(launch));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        throw new RequestError(404, "Workflow run not found.", "NOT_FOUND");
      }

      response.json(workflowRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/findings`, async (request, response, next) => {
    try {
      response.json(workflowRunFindingsResponseSchema.parse(
        await workflowRunArtifactsService.getFindings(request.params.id)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/coverage`, async (request, response, next) => {
    try {
      response.json(workflowRunCoverageResponseSchema.parse(
        await workflowRunArtifactsService.getCoverage(request.params.id)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/transcript`, async (request, response, next) => {
    try {
      response.json(workflowRunTranscriptResponseSchema.parse(
        await workflowRunArtifactsService.getTranscript(request.params.id)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/report`, async (request, response, next) => {
    try {
      response.json(workflowRunReportSchema.parse(
        await workflowRunArtifactsService.getReport(request.params.id)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/evaluation`, async (request, response, next) => {
    try {
      response.json(workflowRunEvaluationResponseSchema.parse(
        await workflowRunEvaluationService.evaluateRun(request.params.id)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.workflowRuns}/:id/events`, async (request, response, next) => {
    try {
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        throw new RequestError(404, "Workflow run not found.", "NOT_FOUND");
      }

      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.flushHeaders?.();

      writeSseMessage(response, workflowRunStreamMessageSchema.parse({
        type: "snapshot",
        run
      }));

      const unsubscribe = workflowRunStream.subscribe(run.id, (message: WorkflowRunStreamMessage) => {
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
      await executionService.stepRun(request.params.id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post(`${apiRoutes.workflowRuns}/:id/cancel`, async (request, response, next) => {
    try {
      await executionService.cancelRun(request.params.id);
      const run = await repository.getRunById(request.params.id);
      if (!run) {
        throw new RequestError(404, "Workflow run not found.", "NOT_FOUND");
      }

      response.json(workflowRunSchema.parse(run));
    } catch (error) {
      next(error);
    }
  });
}
