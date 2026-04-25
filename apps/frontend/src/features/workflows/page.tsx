import { workflowsDefinition } from "@/features/workflows/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const WorkflowsCrudPage = createCrudFeaturePage(workflowsDefinition);

export function WorkflowsPage({
  workflowId,
  workflowNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  workflowId?: string;
  workflowNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <WorkflowsCrudPage
      {...(workflowId ? { recordId: workflowId } : {})}
      {...(workflowNameHint ? { recordNameHint: workflowNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
