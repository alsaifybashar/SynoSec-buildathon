import { aiAgentsDefinition } from "@/features/ai-agents/definition";
import { createCrudFeaturePage } from "@/shared/crud/crud-feature";

const AiAgentsCrudPage = createCrudFeaturePage(aiAgentsDefinition);

export function AiAgentsPage({
  agentId,
  agentNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  agentId?: string;
  agentNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  return (
    <AiAgentsCrudPage
      {...(agentId ? { recordId: agentId } : {})}
      {...(agentNameHint ? { recordNameHint: agentNameHint } : {})}
      onNavigateToList={onNavigateToList}
      onNavigateToCreate={onNavigateToCreate}
      onNavigateToDetail={onNavigateToDetail}
    />
  );
}
