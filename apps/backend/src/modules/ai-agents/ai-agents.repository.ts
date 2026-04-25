import type {
  AiAgent,
  AiAgentsListQuery,
  CreateAiAgentBody,
  UpdateAiAgentBody
} from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";

export interface AiAgentsRepository {
  list(query: AiAgentsListQuery): Promise<PaginatedResult<AiAgent>>;
  getById(id: string): Promise<AiAgent | null>;
  create(input: CreateAiAgentBody): Promise<AiAgent>;
  update(id: string, input: UpdateAiAgentBody): Promise<AiAgent | null>;
  remove(id: string): Promise<boolean>;
}
