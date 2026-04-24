import type {
  AiProvider,
  AiProvidersListQuery,
  CreateAiProviderBody,
  UpdateAiProviderBody
} from "@synosec/contracts";
import type { PaginatedResult } from "@/shared/pagination/paginated-result.js";

export type StoredAiProvider = AiProvider & { apiKey: string | null };

export interface AiProvidersRepository {
  list(query: AiProvidersListQuery): Promise<PaginatedResult<AiProvider>>;
  getById(id: string): Promise<AiProvider | null>;
  getStoredById(id: string): Promise<StoredAiProvider | null>;
  create(input: CreateAiProviderBody): Promise<AiProvider>;
  update(id: string, input: UpdateAiProviderBody): Promise<AiProvider | null>;
  remove(id: string): Promise<boolean>;
}
