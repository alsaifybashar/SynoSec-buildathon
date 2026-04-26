import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AiAgent, AiTool, Target } from "@synosec/contracts";
import { aiAgentsResource } from "@/features/ai-agents/resource";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { targetsResource } from "@/features/targets/resource";

export type WorkflowDefinitionContext = {
  targets: Target[];
  agents: AiAgent[];
  tools: AiTool[];
  targetLookup: Record<string, string>;
  agentLookup: Record<string, AiAgent>;
  toolLookup: Record<string, string>;
  defaultAgentId: string;
};

export function useWorkflowDefinitionContext(): WorkflowDefinitionContext {
  const [targets, setTargets] = useState<Target[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      targetsResource.list({ ...targetsResource.defaultQuery, pageSize: 100 }),
      aiAgentsResource.list({ ...aiAgentsResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([targetsResult, agentsResult, toolsResult]) => {
        if (!active) {
          return;
        }

        setTargets(targetsResult.items);
        setAgents(agentsResult.items);
        setTools(toolsResult.items);
      })
      .catch((error) => {
        toast.error("Failed to load workflow dependencies", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const targetLookup = useMemo(
    () => Object.fromEntries(targets.map((item) => [item.id, item.name])),
    [targets]
  );
  const agentLookup = useMemo(
    () => Object.fromEntries(agents.map((item) => [item.id, item])),
    [agents]
  );
  const toolLookup = useMemo(
    () => Object.fromEntries(tools.map((item) => [item.id, item.name])),
    [tools]
  );

  return useMemo(
    () => ({
      targets,
      agents,
      tools,
      targetLookup,
      agentLookup,
      toolLookup,
      defaultAgentId: agents[0]?.id ?? ""
    }),
    [agentLookup, agents, targetLookup, targets, toolLookup, tools]
  );
}
