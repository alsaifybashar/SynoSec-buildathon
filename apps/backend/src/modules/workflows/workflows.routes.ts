import {
  apiRoutes,
  createWorkflowBodySchema,
  listWorkflowsResponseSchema,
  updateWorkflowBodySchema,
  workflowSchema
} from "@synosec/contracts";
import { type Express } from "express";
import { type WorkflowsRepository } from "./workflows.repository.js";

export function registerWorkflowsRoutes(app: Express, repository: WorkflowsRepository) {
  app.get(apiRoutes.workflows, async (_request, response, next) => {
    try {
      const workflows = await repository.list();
      response.json(listWorkflowsResponseSchema.parse({ workflows }));
    } catch (error) {
      next(error);
    }
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
}
