import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AiAgent, AiTool, Application, Runtime } from "@synosec/contracts";
import { aiAgentsResource } from "@/features/ai-agents/resource";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { applicationsResource } from "@/features/applications/resource";
import { runtimesResource } from "@/features/runtimes/resource";

export type WorkflowDefinitionContext = {
  applications: Application[];
  runtimes: Runtime[];
  agents: AiAgent[];
  tools: AiTool[];
  applicationLookup: Record<string, string>;
  agentLookup: Record<string, AiAgent>;
  toolLookup: Record<string, string>;
  defaultApplicationId: string;
  defaultAgentId: string;
};

export function useWorkflowDefinitionContext(): WorkflowDefinitionContext {
  const [applications, setApplications] = useState<Application[]>([]);
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      applicationsResource.list({ ...applicationsResource.defaultQuery, pageSize: 100 }),
      runtimesResource.list({ ...runtimesResource.defaultQuery, pageSize: 100 }),
      aiAgentsResource.list({ ...aiAgentsResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([applicationsResult, runtimesResult, agentsResult, toolsResult]) => {
        if (!active) {
          return;
        }

        setApplications(applicationsResult.items);
        setRuntimes(runtimesResult.items);
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

  const applicationLookup = useMemo(
    () => Object.fromEntries(applications.map((item) => [item.id, item.name])),
    [applications]
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
      applications,
      runtimes,
      agents,
      tools,
      applicationLookup,
      agentLookup,
      toolLookup,
      defaultApplicationId: applications[0]?.id ?? "",
      defaultAgentId: agents[0]?.id ?? ""
    }),
    [agentLookup, agents, applicationLookup, applications, runtimes, toolLookup, tools]
  );
}
