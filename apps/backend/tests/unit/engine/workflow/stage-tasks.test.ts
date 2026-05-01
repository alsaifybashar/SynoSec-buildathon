import { describe, expect, it } from "vitest";
import type { AiTool, WorkflowStageTask } from "@synosec/contracts";
import { expandStageTasks } from "@/engine/workflow/stage-tasks.js";

function tool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "builtin-http-surface-assessment",
    name: "Assess HTTP",
    kind: "builtin-action",
    status: "active",
    source: "system",
    accessProfile: "standard",
    description: null,
    executorType: "builtin",
    builtinActionKey: "http_surface_assessment",
    bashSource: null,
    capabilities: ["http-surface", "web"],
    category: "web",
    riskTier: "passive",
    timeoutMs: 1000,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

const httpTool = tool();
const authTool = tool({
  id: "builtin-auth-flow",
  name: "Auth Flow",
  builtinActionKey: "auth_flow_assessment",
  capabilities: ["auth", "web"]
});
const tools = [httpTool, authTool];

const baseTask: WorkflowStageTask = {
  id: "scan-surface",
  title: "Probe HTTP surface",
  objective: "Identify the externally reachable HTTP entry point.",
  suggestedCapabilities: [],
  suggestedToolIds: []
};

describe("expandStageTasks", () => {
  it("returns null when no tasks declared", () => {
    expect(expandStageTasks({ tasks: [] }, tools)).toBeNull();
    expect(expandStageTasks({ tasks: undefined as unknown as never[] }, tools)).toBeNull();
  });

  it("renders a task block with capability-matched tools", () => {
    const out = expandStageTasks({
      tasks: [{ ...baseTask, suggestedCapabilities: ["http-surface"] }]
    }, tools);
    expect(out).toContain("## Stage tasks");
    expect(out).toContain("### Probe HTTP surface (id=scan-surface)");
    expect(out).toContain("Suggested tools: http_surface_assessment");
    expect(out).not.toContain("auth_flow_assessment");
  });

  it("includes completion criteria when provided", () => {
    const out = expandStageTasks({
      tasks: [{ ...baseTask, completionCriteria: "At least one observation persisted." }]
    }, tools);
    expect(out).toContain("Completion criteria: At least one observation persisted.");
  });

  it("dedupes tools matched by both id and capability", () => {
    const out = expandStageTasks({
      tasks: [{
        ...baseTask,
        suggestedToolIds: [httpTool.id],
        suggestedCapabilities: ["http-surface"]
      }]
    }, tools)!;
    const occurrences = out.match(/http_surface_assessment/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it("omits the suggested tools line when no tools match", () => {
    const out = expandStageTasks({
      tasks: [{ ...baseTask, suggestedCapabilities: ["does-not-exist"] }]
    }, tools)!;
    expect(out).not.toContain("Suggested tools:");
  });
});
