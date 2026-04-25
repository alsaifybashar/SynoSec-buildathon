import type {
  CreateExecutionConstraintBody,
  ExecutionConstraint,
  ExecutionConstraintsListQuery,
  UpdateExecutionConstraintBody
} from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";

export interface ExecutionConstraintsRepository {
  list(query: ExecutionConstraintsListQuery): Promise<PaginatedResult<ExecutionConstraint>>;
  getById(id: string): Promise<ExecutionConstraint | null>;
  create(input: CreateExecutionConstraintBody): Promise<ExecutionConstraint>;
  update(id: string, input: UpdateExecutionConstraintBody): Promise<ExecutionConstraint | null>;
  remove(id: string): Promise<boolean>;
}
