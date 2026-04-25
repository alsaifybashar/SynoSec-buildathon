import type { CreateRuntimeBody, RuntimesListQuery, Runtime, UpdateRuntimeBody } from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";

export interface RuntimesRepository {
  list(query: RuntimesListQuery): Promise<PaginatedResult<Runtime>>;
  getById(id: string): Promise<Runtime | null>;
  create(input: CreateRuntimeBody): Promise<Runtime>;
  update(id: string, input: UpdateRuntimeBody): Promise<Runtime | null>;
  remove(id: string): Promise<boolean>;
}
