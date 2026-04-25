import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { MemoryAiToolsRepository } from "./memory-ai-tools.repository.js";

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "HTTP Recon",
    status: "active",
    source: "system",
    description: "Persisted bash tool",
    binary: "httpx",
    executorType: "bash",
    builtinActionKey: null,
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["web-recon"],
    category: "web",
    riskTier: "passive",
    notes: null,
    sandboxProfile: "network-recon",
    privilegeProfile: "read-only-network",
    timeoutMs: 1000,
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: { type: "string" }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      }
    },
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
    ...overrides
  };
}

describe("MemoryAiToolsRepository", () => {
  it("normalizes persisted tools to custom and exposes builtin system tools", async () => {
    const repository = new MemoryAiToolsRepository([createTool()]);

    const allTools = await repository.list({
      page: 1,
      pageSize: 25,
      q: "",
      sortBy: "name",
      sortDirection: "asc"
    });

    expect(allTools.items.some((tool) => tool.id === "tool-1" && tool.source === "custom")).toBe(true);
    expect(allTools.items.some((tool) => tool.id === "builtin-report-finding" && tool.source === "system")).toBe(true);

    const builtinOnly = await repository.list({
      page: 1,
      pageSize: 25,
      q: "",
      sortBy: "name",
      sortDirection: "asc",
      source: "system"
    });

    expect(builtinOnly.items.map((tool) => tool.id)).toEqual([
      "builtin-attack-chain-correlation",
      "builtin-deep-analysis",
      "builtin-report-finding"
    ]);
    expect(allTools.items.some((tool) => tool.id === "builtin-deep-analysis" && tool.source === "system")).toBe(true);
  });

  it("returns builtin tools by id and rejects builtin mutation", async () => {
    const repository = new MemoryAiToolsRepository([createTool()]);
    const builtin = await repository.getById("builtin-report-finding");

    expect(builtin).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_finding"
    });

    await expect(repository.update("builtin-report-finding", {
      name: "Mutated"
    })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_BUILTIN_IMMUTABLE"
    });
  });
});
