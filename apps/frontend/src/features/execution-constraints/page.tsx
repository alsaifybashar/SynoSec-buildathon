import { executionConstraintsDefinition } from "@/features/execution-constraints/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const ExecutionConstraintsCrudPage = createCrudFeaturePage(executionConstraintsDefinition);

export function ExecutionConstraintsPage({
  constraintId,
  constraintNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  constraintId?: string;
  constraintNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <ExecutionConstraintsCrudPage
      {...(constraintId ? { recordId: constraintId } : {})}
      {...(constraintNameHint ? { recordNameHint: constraintNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
