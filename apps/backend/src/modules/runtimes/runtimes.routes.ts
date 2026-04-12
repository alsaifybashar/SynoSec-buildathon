import {
  apiRoutes,
  createRuntimeBodySchema,
  listRuntimesResponseSchema,
  runtimeSchema,
  updateRuntimeBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { type RuntimesRepository } from "./runtimes.repository.js";

export function registerRuntimesRoutes(app: Express, repository: RuntimesRepository) {
  app.get(apiRoutes.runtimes, async (_request, response, next) => {
    try {
      const runtimes = await repository.list();
      response.json(listRuntimesResponseSchema.parse({ runtimes }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.runtimes}/:id`, async (request, response, next) => {
    try {
      const runtime = await repository.getById(request.params.id);

      if (!runtime) {
        response.status(404).json({ message: "Runtime not found." });
        return;
      }

      response.json(runtimeSchema.parse(runtime));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.runtimes, async (request, response, next) => {
    try {
      const input = createRuntimeBodySchema.parse(request.body);
      const runtime = await repository.create(input);
      response.status(201).json(runtimeSchema.parse(runtime));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.runtimes}/:id`, async (request, response, next) => {
    try {
      const input = updateRuntimeBodySchema.parse(request.body);
      const runtime = await repository.update(request.params.id, input);

      if (!runtime) {
        response.status(404).json({ message: "Runtime not found." });
        return;
      }

      response.json(runtimeSchema.parse(runtime));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.runtimes}/:id`, async (request, response, next) => {
    try {
      const removed = await repository.remove(request.params.id);

      if (!removed) {
        response.status(404).json({ message: "Runtime not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
