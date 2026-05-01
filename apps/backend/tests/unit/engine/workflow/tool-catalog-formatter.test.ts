import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import {
  formatToolCatalogForLLM,
  formatToolEntryForLLM,
  splitWhenGuidance
} from "@/engine/workflow/tool-catalog-formatter.js";
import type { SemanticFamilyDefinition } from "@/modules/ai-tools/semantic-family-tools.js";

const baseTool: AiTool = {
  id: "builtin-http-surface-assessment",
  name: "Assess HTTP Surface",
  kind: "builtin-action",
  status: "active",
  source: "system",
  accessProfile: "standard",
  description: "Assess one explicit HTTP target. Use this when you need a bounded first look at a known web surface. It does not prove hidden routes or authenticated behavior.",
  executorType: "builtin",
  builtinActionKey: "http_surface_assessment",
  bashSource: null,
  capabilities: ["http-surface", "web", "passive"],
  category: "web",
  riskTier: "passive",
  timeoutMs: 30000,
  constraintProfile: {
    enforced: true,
    targetKinds: ["host", "url"],
    networkBehavior: "outbound-read",
    mutationClass: "none",
    supportsHostAllowlist: true,
    supportsPathExclusions: false,
    supportsRateLimit: true
  },
  coveredToolIds: ["native-http-surface-assessment"],
  candidateToolIds: ["native-http-surface-assessment"],
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      targetUrl: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: []
  },
  outputSchema: { type: "object", additionalProperties: false, properties: {}, required: [] },
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z"
};

const familyDefinition: SemanticFamilyDefinition = {
  tool: baseTool,
  requiredInputFields: ["baseUrl"],
  coveredToolIds: ["native-http-surface-assessment"],
  candidateToolIds: ["native-http-surface-assessment"]
};

describe("splitWhenGuidance", () => {
  it("extracts use-when and does-not clauses", () => {
    const result = splitWhenGuidance(baseTool.description);
    expect(result.whenToUse).toMatch(/^Use this when/);
    expect(result.whenNotTo).toMatch(/^It does not/);
    expect(result.core).not.toMatch(/Use this when/);
    expect(result.core).not.toMatch(/It does not/);
  });

  it("returns the raw description when no markers present", () => {
    const result = splitWhenGuidance("Plain description without markers.");
    expect(result.core).toBe("Plain description without markers.");
    expect(result.whenToUse).toBeUndefined();
    expect(result.whenNotTo).toBeUndefined();
  });

  it("handles null/undefined", () => {
    expect(splitWhenGuidance(null).core).toBe("");
    expect(splitWhenGuidance(undefined).core).toBe("");
  });
});

describe("formatToolEntryForLLM", () => {
  it("emits structured block for a semantic-family tool", () => {
    const out = formatToolEntryForLLM({
      exposedName: "http_surface_assessment",
      tool: baseTool,
      familyDefinition
    });
    expect(out).toContain("### http_surface_assessment (riskTier=passive, category=web)");
    expect(out).toContain("Capabilities: http-surface, web, passive");
    expect(out).toContain("Required inputs: baseUrl");
    expect(out).toContain("Constraints: network=outbound-read, mutation=none, targetKinds=host|url, hostAllowlist, rateLimit");
    expect(out).toContain("When to use: Use this when you need a bounded first look");
    expect(out).toContain("When not to: It does not prove hidden routes");
  });

  it("falls back to inputSchema.required when no familyDefinition", () => {
    const tool: AiTool = {
      ...baseTool,
      inputSchema: { type: "object", additionalProperties: false, properties: { command: { type: "string" } }, required: ["command"] }
    };
    const out = formatToolEntryForLLM({ exposedName: "bash", tool });
    expect(out).toContain("Required inputs: command");
  });

  it("renders literal description when no tool provided", () => {
    const out = formatToolEntryForLLM({ exposedName: "log_progress", literalDescription: "Persist a short update." });
    expect(out).toBe("### log_progress\nPersist a short update.");
  });

  it("returns null for an empty entry", () => {
    expect(formatToolEntryForLLM({ exposedName: "noop" })).toBeNull();
  });

  it("omits sections that have no content", () => {
    const tool: AiTool = {
      ...baseTool,
      capabilities: [],
      constraintProfile: undefined,
      description: "Plain description.",
      inputSchema: { type: "object", additionalProperties: false, properties: {}, required: [] }
    };
    const out = formatToolEntryForLLM({ exposedName: "minimal", tool })!;
    expect(out).not.toContain("Capabilities:");
    expect(out).not.toContain("Required inputs:");
    expect(out).not.toContain("Constraints:");
    expect(out).not.toContain("When to use:");
  });

  it("truncates long descriptions", () => {
    const longCore = "A".repeat(800);
    const tool: AiTool = { ...baseTool, description: longCore };
    const out = formatToolEntryForLLM({ exposedName: "big", tool })!;
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(longCore.length);
  });
});

describe("formatToolCatalogForLLM", () => {
  it("groups entries by section title and skips empty sections", () => {
    const out = formatToolCatalogForLLM([
      {
        title: "Evidence tools",
        entries: [{ exposedName: "http_surface_assessment", tool: baseTool, familyDefinition }]
      },
      { title: "Built-in actions", entries: [{ exposedName: "log_progress", literalDescription: "Log it." }] },
      { title: "Empty", entries: [] }
    ]);
    expect(out).toContain("## Evidence tools");
    expect(out).toContain("## Built-in actions");
    expect(out).not.toContain("## Empty");
  });
});
