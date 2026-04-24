import { runtimesDefinition } from "@/features/runtimes/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const RuntimesCrudPage = createCrudFeaturePage(runtimesDefinition);

export function RuntimesPage({
  runtimeId,
  runtimeNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  runtimeId?: string;
  runtimeNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <RuntimesCrudPage
      {...(runtimeId ? { recordId: runtimeId } : {})}
      {...(runtimeNameHint ? { recordNameHint: runtimeNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
