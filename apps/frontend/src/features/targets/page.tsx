import { targetsDefinition } from "@/features/targets/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const TargetsCrudPage = createCrudFeaturePage(targetsDefinition);

export function TargetsPage({
  targetId,
  targetNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  targetId?: string;
  targetNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <TargetsCrudPage
      {...(targetId ? { recordId: targetId } : {})}
      {...(targetNameHint ? { recordNameHint: targetNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
