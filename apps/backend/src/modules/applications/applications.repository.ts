import type { Application, ApplicationsListQuery, CreateApplicationBody, UpdateApplicationBody } from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";

export interface ApplicationsRepository {
  list(query: ApplicationsListQuery): Promise<PaginatedResult<Application>>;
  getById(id: string): Promise<Application | null>;
  create(input: CreateApplicationBody): Promise<Application>;
  update(id: string, input: UpdateApplicationBody): Promise<Application | null>;
  remove(id: string): Promise<boolean>;
}
