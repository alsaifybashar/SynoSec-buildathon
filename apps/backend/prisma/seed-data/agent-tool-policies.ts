import type { ToolCategory, ToolRiskTier } from "@synosec/contracts";
import type { ToolPhase } from "@/features/ai-tools/runtime/catalog/index.js";

export interface AgentToolPolicy {
  agentId: string;
  pinnedToolIds: string[];
  selectionCriteria: {
    categories?: ToolCategory[];
    riskTiers?: ToolRiskTier[];
    phases?: ToolPhase[];
    tags?: string[];
    maxCount?: number;
  };
}

// Rollout stays opt-in: add agents here one at a time to activate policy-based expansion.
export const AGENT_TOOL_POLICIES: AgentToolPolicy[] = [];
