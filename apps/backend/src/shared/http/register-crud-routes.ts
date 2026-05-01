import { type Express } from "express";
import { type ZodType, type ZodTypeAny, z } from "zod";
import { handlePaginatedListRoute } from "@/shared/http/paginated-list-route.js";
import { RequestError } from "@/shared/http/request-error.js";

type CrudRepository<TItem, TListQuery, TCreateBody, TUpdateBody> = {
  list(query: TListQuery): Promise<{
    items: TItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>;
  getById(id: string): Promise<TItem | null>;
  create(input: TCreateBody): Promise<TItem>;
  update(id: string, input: TUpdateBody): Promise<TItem | null>;
  remove(id: string): Promise<boolean>;
};

export function registerCrudRoutes<
  TItem,
  TQuerySchema extends ZodTypeAny,
  TCreateSchema extends ZodTypeAny,
  TUpdateSchema extends ZodTypeAny
>(app: Express, options: {
  resourcePath: string;
  repository: CrudRepository<TItem, z.output<TQuerySchema>, z.output<TCreateSchema>, z.output<TUpdateSchema>>;
  querySchema: TQuerySchema;
  listResponseSchema: ZodType<unknown>;
  listDataKey: string;
  itemSchema: ZodType<TItem>;
  createBodySchema: TCreateSchema;
  updateBodySchema: TUpdateSchema;
  notFoundMessage: string;
}) {
  app.get(options.resourcePath, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: options.querySchema,
      responseSchema: options.listResponseSchema,
      dataKey: options.listDataKey,
      load: (query) => options.repository.list(query)
    });
  });

  app.get(`${options.resourcePath}/:id`, async (request, response, next) => {
    try {
      const item = await options.repository.getById(request.params.id);
      if (!item) {
        throw new RequestError(404, options.notFoundMessage, "NOT_FOUND");
      }

      response.json(options.itemSchema.parse(item));
    } catch (error) {
      next(error);
    }
  });

  app.post(options.resourcePath, async (request, response, next) => {
    try {
      const input = options.createBodySchema.parse(request.body);
      const item = await options.repository.create(input);
      response.status(201).json(options.itemSchema.parse(item));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${options.resourcePath}/:id`, async (request, response, next) => {
    try {
      const input = options.updateBodySchema.parse(request.body);
      const item = await options.repository.update(request.params.id, input);
      if (!item) {
        throw new RequestError(404, options.notFoundMessage, "NOT_FOUND");
      }

      response.json(options.itemSchema.parse(item));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${options.resourcePath}/:id`, async (request, response, next) => {
    try {
      const removed = await options.repository.remove(request.params.id);
      if (!removed) {
        throw new RequestError(404, options.notFoundMessage, "NOT_FOUND");
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
