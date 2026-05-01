import { describe, expect, it } from "vitest";
import type { AiAgent, AiTool } from "@synosec/contracts";
import { resolveAgentTools } from "@/modules/ai-agents/agent-tool-resolver.js";

function createTool(overrides: Partial<AiTool> & Pick<AiTool, "id" | "name" | "category" | "riskTier">): AiTool {
  return {
    id: overrides.id,
    name: overrides.name,
    kind: overrides.kind ?? "raw-adapter",
    status: overrides.status ?? "active",
    source: overrides.source ?? "system",
    accessProfile: overrides.accessProfile ?? "standard",
    description: overrides.description ?? null,
    executorType: overrides.executorType ?? "bash",
    builtinActionKey: overrides.builtinActionKey ?? null,
    bashSource: overrides.bashSource ?? "#!/usr/bin/env bash\necho ok",
    capabilities: overrides.capabilities ?? [],
    category: overrides.category,
    riskTier: overrides.riskTier,
    timeoutMs: overrides.timeoutMs ?? 30000,
    coveredToolIds: overrides.coveredToolIds ?? [],
    candidateToolIds: overrides.candidateToolIds ?? [],
    inputSchema: overrides.inputSchema ?? { type: "object", properties: {} },
    outputSchema: overrides.outputSchema ?? { type: "object", properties: {} },
    createdAt: overrides.createdAt ?? "2026-04-24T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-24T00:00:00.000Z"
  };
}

function createAgent(toolAccessMode: AiAgent["toolAccessMode"]): Pick<AiAgent, "toolAccessMode"> {
  return { toolAccessMode };
}

describe("resolveAgentTools", () => {
  it("returns only standard system tools for system mode", () => {
    const tools = [
      createTool({ id: "seed-http-recon", name: "HTTP Recon", category: "web", riskTier: "passive" }),
      createTool({ id: "seed-agent-bash-command", name: "Agent Bash Command", category: "utility", riskTier: "active", accessProfile: "shell" }),
      createTool({ id: "custom-tool", name: "Custom Tool", category: "utility", riskTier: "passive", source: "custom" })
    ];

    const resolved = resolveAgentTools(createAgent("system"), tools);

    expect(resolved.map((tool) => tool.id)).toEqual(["seed-http-recon"]);
  });

  it("includes custom and shell-profile tools for system_plus_custom mode", () => {
    const tools = [
      createTool({ id: "seed-http-recon", name: "HTTP Recon", category: "web", riskTier: "passive" }),
      createTool({ id: "seed-agent-bash-command", name: "Agent Bash Command", category: "utility", riskTier: "active", accessProfile: "shell" }),
      createTool({ id: "custom-tool", name: "Custom Tool", category: "utility", riskTier: "passive", source: "custom" })
    ];

    const resolved = resolveAgentTools(createAgent("system_plus_custom"), tools);

    expect(resolved.map((tool) => tool.id)).toEqual([
      "seed-http-recon",
      "seed-agent-bash-command",
      "custom-tool"
    ]);
  });

  it("excludes inactive tools regardless of mode", () => {
    const tools = [
      createTool({ id: "inactive-tool", name: "Inactive", category: "web", riskTier: "passive", status: "inactive" }),
      createTool({ id: "active-tool", name: "Active", category: "web", riskTier: "passive" })
    ];

    const resolved = resolveAgentTools(createAgent("system_plus_custom"), tools);

    expect(resolved.map((tool) => tool.id)).toEqual(["active-tool"]);
  });
});
