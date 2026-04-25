import { aiProvidersDefinition } from "@/features/ai-providers/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const AiProvidersCrudPage = createCrudFeaturePage(aiProvidersDefinition);

export function AiProvidersPage({
  providerId,
  providerNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  providerId?: string;
  providerNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <AiProvidersCrudPage
      {...(providerId ? { recordId: providerId } : {})}
      {...(providerNameHint ? { recordNameHint: providerNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
