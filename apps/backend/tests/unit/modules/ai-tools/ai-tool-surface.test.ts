import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { classifyAiToolKind, isRegistryVisibleAiTool } from "@/modules/ai-tools/ai-tool-surface.js";

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "HTTP Recon",
    kind: "raw-adapter",
    status: "active",
    source: "custom",
    accessProfile: "standard",
    description: "Persisted bash tool",
    executorType: "bash",
    builtinActionKey: null,
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["web-recon"],
    category: "web",
    riskTier: "passive",
    timeoutMs: 1000,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
    ...overrides
  };
}

describe("ai tool surface", () => {
  it("classifies raw adapters as internal-only registry entries", () => {
    const rawAdapter = createTool();

    expect(classifyAiToolKind(rawAdapter)).toBe("raw-adapter");
    expect(isRegistryVisibleAiTool(rawAdapter)).toBe(false);
  });

  it("keeps builtin workflow-facing tools visible in the registry", () => {
    const builtinAction = createTool({
      id: "builtin-log-progress",
      executorType: "builtin",
      bashSource: null,
      capabilities: ["workflow-control"]
    });
    const builtinMappedFunction = createTool({
      id: "builtin-http-surface-assessment",
      executorType: "builtin",
      bashSource: null,
      capabilities: ["http-surface"]
    });

    expect(classifyAiToolKind(builtinAction)).toBe("builtin-action");
    expect(isRegistryVisibleAiTool(builtinAction)).toBe(true);
    expect(classifyAiToolKind(builtinMappedFunction)).toBe("builtin-action");
    expect(isRegistryVisibleAiTool(builtinMappedFunction)).toBe(true);
  });
});
