import { applicationsDefinition } from "@/features/applications/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const ApplicationsCrudPage = createCrudFeaturePage(applicationsDefinition);

export function ApplicationsPage({
  applicationId,
  applicationNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  applicationId?: string;
  applicationNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <ApplicationsCrudPage
      {...(applicationId ? { recordId: applicationId } : {})}
      {...(applicationNameHint ? { recordNameHint: applicationNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
