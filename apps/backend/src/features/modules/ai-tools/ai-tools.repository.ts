import type {
  AiTool,
  AiToolsListQuery,
  CreateAiToolBody,
  UpdateAiToolBody
} from "@synosec/contracts";
import type { PaginatedResult } from "../../../platform/core/pagination/paginated-result.js";

export interface AiToolsRepository {
  list(query: AiToolsListQuery): Promise<PaginatedResult<AiTool>>;
  getById(id: string): Promise<AiTool | null>;
  create(input: CreateAiToolBody): Promise<AiTool>;
  update(id: string, input: UpdateAiToolBody): Promise<AiTool | null>;
  remove(id: string): Promise<boolean>;
}
