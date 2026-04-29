import type { AiAgent, AiTool } from "@synosec/contracts";

export function resolveAgentTools(agent: Pick<AiAgent, "toolAccessMode">, allTools: AiTool[]): AiTool[] {
  return allTools.filter((tool) => {
    if (tool.status !== "active") {
      return false;
    }

    const accessProfile = tool.accessProfile ?? "standard";

    if (agent.toolAccessMode === "system") {
      return tool.source === "system" && accessProfile === "standard";
    }

    return accessProfile === "standard" || accessProfile === "shell";
  });
}
