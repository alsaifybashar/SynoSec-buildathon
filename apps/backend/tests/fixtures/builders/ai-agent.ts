import type { AiAgent } from "@synosec/contracts";

export function buildAiAgent(overrides: Partial<AiAgent> = {}): AiAgent {
  return {
    id: "30000000-0000-0000-0000-000000000001",
    name: "Pipeline Operator",
    status: "active",
    description: "Default test agent.",
    systemPrompt: "Collect evidence and report findings.",
    toolAccessMode: "system",
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}
