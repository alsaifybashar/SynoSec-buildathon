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
    executorType: "bash",
    builtinActionKey: null,
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["web-recon"],
    category: "web",
    riskTier: "passive",
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
      pageSize: 100,
      q: "",
      surface: "advanced",
      sortBy: "name",
      sortDirection: "asc"
    });

    expect(allTools.items.some((tool) => tool.id === "tool-1" && tool.source === "custom")).toBe(true);
    expect(allTools.items.some((tool) => tool.id === "builtin-report-finding" && tool.source === "system")).toBe(true);

    const primaryOnly = await repository.list({
      page: 1,
      pageSize: 100,
      q: "",
      sortBy: "name",
      sortDirection: "asc"
    });

    expect(primaryOnly.items.some((tool) => tool.id === "tool-1")).toBe(false);
    expect(primaryOnly.items.every((tool) => tool.kind !== "raw-adapter")).toBe(true);

    const builtinOnly = await repository.list({
      page: 1,
      pageSize: 100,
      q: "",
      sortBy: "name",
      sortDirection: "asc",
      source: "system"
    });

    expect(builtinOnly.items.map((tool) => tool.id)).toEqual(expect.arrayContaining([
      "builtin-complete-run",
      "builtin-log-progress",
      "builtin-report-finding",
      "builtin-http-surface-assessment",
      "builtin-content-discovery",
      "builtin-network-host-discovery"
    ]));
    expect(allTools.items.some((tool) => tool.id === "builtin-complete-run" && tool.source === "system")).toBe(true);
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
