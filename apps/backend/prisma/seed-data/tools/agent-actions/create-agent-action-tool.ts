import { loadSeedToolScript } from "../load-script.js";

type SeededAgentActionTool = {
  id: string;
  name: string;
  description: string;
  capabilities: readonly string[];
  binary: string | null;
  category: "web" | "network" | "subdomain" | "content";
  riskTier: "passive" | "active";
  notes: string;
  sandboxProfile: "network-recon" | "active-recon";
  privilegeProfile: "read-only-network" | "active-network";
  timeoutMs: number;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  primary: { name: string; bashSource: string };
};

function encodeBashSource(bashSource: string) {
  return Buffer.from(bashSource, "utf8").toString("base64");
}

export function createAgentActionWrapperScript(input: {
  actionName: string;
  primary: { name: string; bashSource: string };
}) {
  return loadSeedToolScript(import.meta.url, "scripts/tools/agent-actions/execute-agent-action.sh")
    .replace("__AGENT_ACTION_NAME__", input.actionName)
    .replace("__PRIMARY_NAME__", input.primary.name)
    .replace("__PRIMARY_SOURCE_B64__", encodeBashSource(input.primary.bashSource));
}

export function createSeededAgentActionTool(input: SeededAgentActionTool) {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    executorType: "bash" as const,
    get bashSource() {
      return createAgentActionWrapperScript({
        actionName: input.name,
        primary: input.primary
      });
    },
    capabilities: input.capabilities,
    binary: input.binary,
    category: input.category,
    riskTier: input.riskTier,
    notes: input.notes,
    sandboxProfile: input.sandboxProfile,
    privilegeProfile: input.privilegeProfile,
    timeoutMs: input.timeoutMs,
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema
  } as const;
}
