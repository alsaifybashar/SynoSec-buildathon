import {
  apiRoutes,
  createWorkflowBodySchema,
  listWorkflowsResponseSchema,
  workflowRunStreamMessageSchema,
  workflowRunSchema,
  workflowSchema,
  workflowsListQuerySchema,
  updateWorkflowBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { handlePaginatedListRoute } from "../../../platform/core/http/paginated-list-route.js";
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
  app.get(apiRoutes.workflows, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: workflowsListQuerySchema,
      responseSchema: listWorkflowsResponseSchema,
      dataKey: "workflows",
      load: (query) => repository.list(query)
    });
  });

  app.get(`${apiRoutes.workflows}/:id`, async (request, response, next) => {
    try {
      const workflow = await repository.getById(request.params.id);
      if (!workflow) {
        response.status(404).json({ message: "Workflow not found." });
        return;
      }

      response.json(workflowSchema.parse(workflow));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.workflows, async (request, response, next) => {
    try {
      const input = createWorkflowBodySchema.parse(request.body);
      const workflow = await repository.create(input);
      response.status(201).json(workflowSchema.parse(workflow));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.workflows}/:id`, async (request, response, next) => {
    try {
      const input = updateWorkflowBodySchema.parse(request.body);
      const workflow = await repository.update(request.params.id, input);
      if (!workflow) {
        response.status(404).json({ message: "Workflow not found." });
        return;
      }

      response.json(workflowSchema.parse(workflow));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.workflows}/:id`, async (request, response, next) => {
    try {
      const removed = await repository.remove(request.params.id);
      if (!removed) {
        response.status(404).json({ message: "Workflow not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
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
