import type { NextFunction, Request, Response } from "express";
import { type ZodType, type ZodTypeAny, z } from "zod";
import type { PaginatedResult } from "@/platform/core/pagination/paginated-result.js";

export async function handlePaginatedListRoute<TQuerySchema extends ZodTypeAny, Item>(options: {
  request: Request;
  response: Response;
  next: NextFunction;
  querySchema: TQuerySchema;
  responseSchema: ZodType<unknown>;
  dataKey: string;
  load: (query: z.output<TQuerySchema>) => Promise<PaginatedResult<Item>>;
}) {
  try {
    const query = options.querySchema.parse(options.request.query);
    const result = await options.load(query);

    options.response.json(options.responseSchema.parse({
      [options.dataKey]: result.items,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages
    }));
  } catch (error) {
    options.next(error);
  }
}
