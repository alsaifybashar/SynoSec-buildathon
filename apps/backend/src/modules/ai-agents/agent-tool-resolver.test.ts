import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { resolveAgentTools } from "./agent-tool-resolver.js";
import type { AgentToolPolicy } from "@/shared/seed-data/agent-tool-policies.js";

function createTool(overrides: Partial<AiTool> & Pick<AiTool, "id" | "name" | "category" | "riskTier">): AiTool {
  return {
    id: overrides.id,
    name: overrides.name,
    status: "active",
    source: "system",
    description: overrides.description ?? null,
    binary: overrides.binary ?? "bash",
    executorType: "bash",
    bashSource: overrides.bashSource ?? "#!/usr/bin/env bash\necho ok",
    capabilities: overrides.capabilities ?? [],
    category: overrides.category,
    riskTier: overrides.riskTier,
    notes: overrides.notes ?? null,
    sandboxProfile: overrides.sandboxProfile ?? "network-recon",
    privilegeProfile: overrides.privilegeProfile ?? "read-only-network",
    timeoutMs: overrides.timeoutMs ?? 30000,
    inputSchema: overrides.inputSchema ?? { type: "object", properties: {} },
    outputSchema: overrides.outputSchema ?? { type: "object", properties: {} },
    createdAt: overrides.createdAt ?? "2026-04-24T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-24T00:00:00.000Z"
  };
}

describe("resolveAgentTools", () => {
  it("preserves explicit toolIds when no policy is configured", async () => {
    const tools = [
      createTool({ id: "seed-http-recon", name: "HTTP Recon", category: "web", riskTier: "passive" }),
      createTool({ id: "seed-service-scan", name: "Service Scan", category: "network", riskTier: "passive" })
    ];

    const resolved = await resolveAgentTools("agent-1", ["seed-service-scan"], tools, undefined);

    expect(resolved.map((tool) => tool.id)).toEqual(["seed-service-scan"]);
  });

  it("merges pinned, explicit, and policy-matched tools without duplicates", async () => {
    const tools = [
      createTool({ id: "httpx", name: "HTTPx", category: "web", riskTier: "passive" }),
      createTool({ id: "whatweb", name: "WhatWeb", category: "web", riskTier: "passive" }),
      createTool({ id: "nmap", name: "Nmap", category: "network", riskTier: "passive" }),
      createTool({ id: "nikto", name: "Nikto", category: "web", riskTier: "active" })
    ];
    const policy: AgentToolPolicy = {
      agentId: "agent-1",
      pinnedToolIds: ["httpx"],
      selectionCriteria: {
        categories: ["network", "web"],
        riskTiers: ["passive"],
        phases: ["recon", "enum"],
        maxCount: 10
      }
    };

    const resolved = await resolveAgentTools("agent-1", ["nmap"], tools, policy);

    expect(resolved.map((tool) => tool.id)).toEqual([
      "httpx",
      "nmap",
      "whatweb"
    ]);
  });

  it("respects tag and maxCount filters for policy-selected tools", async () => {
    const tools = [
      createTool({ id: "httpx", name: "HTTPx", category: "web", riskTier: "passive" }),
      createTool({ id: "whatweb", name: "WhatWeb", category: "web", riskTier: "passive" }),
      createTool({ id: "ffuf", name: "FFuf", category: "content", riskTier: "passive" })
    ];
    const policy: AgentToolPolicy = {
      agentId: "agent-1",
      pinnedToolIds: [],
      selectionCriteria: {
        tags: ["probe"],
        maxCount: 1
      }
    };

    const resolved = await resolveAgentTools("agent-1", [], tools, policy);

    expect(resolved.map((tool) => tool.id)).toEqual(["httpx"]);
  });
});
