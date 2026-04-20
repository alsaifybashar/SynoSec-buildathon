import type {
  AiProvider,
  AiProvidersListQuery,
  CreateAiProviderBody,
  UpdateAiProviderBody
} from "@synosec/contracts";
import type { PaginatedResult } from "../../../platform/core/pagination/paginated-result.js";

export interface AiProvidersRepository {
  list(query: AiProvidersListQuery): Promise<PaginatedResult<AiProvider>>;
  getById(id: string): Promise<AiProvider | null>;
  create(input: CreateAiProviderBody): Promise<AiProvider>;
  update(id: string, input: UpdateAiProviderBody): Promise<AiProvider | null>;
  remove(id: string): Promise<boolean>;
}
