import type { AiTool } from "@synosec/contracts";

export function buildAiTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "custom-http-proof",
    name: "Custom HTTP Proof",
    kind: "raw-adapter",
    status: "active",
    source: "system",
    accessProfile: "standard",
    description: "Return a deterministic proof snippet.",
    executorType: "bash",
    builtinActionKey: null,
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["web-recon", "passive"],
    category: "web",
    riskTier: "passive",
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-read",
      mutationClass: "none",
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: false
    },
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: { type: "string" }
      },
      required: ["baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      },
      required: ["output"]
    },
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}
