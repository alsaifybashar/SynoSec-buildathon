import type { CreateTargetBody, Target, TargetsListQuery, UpdateTargetBody } from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";

export interface TargetsRepository {
  list(query: TargetsListQuery): Promise<PaginatedResult<Target>>;
  getById(id: string): Promise<Target | null>;
  create(input: CreateTargetBody): Promise<Target>;
  update(id: string, input: UpdateTargetBody): Promise<Target | null>;
  remove(id: string): Promise<boolean>;
}
