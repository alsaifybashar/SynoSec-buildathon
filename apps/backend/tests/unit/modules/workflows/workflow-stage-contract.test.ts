import { describe, expect, it } from "vitest";
import {
  createDefaultWorkflowStageContract,
  defaultStageSystemPromptTemplate,
  normalizeWorkflowStageContract
} from "@/modules/workflows/workflow-stage-contract.js";

describe("workflow stage contracts", () => {
  it("creates stable defaults for early-stage workflows", () => {
    const contract = createDefaultWorkflowStageContract(
      { label: "Recon" },
      ["builtin-http-surface-assessment", "builtin-http-surface-assessment", "", "seed-http-recon", "builtin-content-discovery"]
    );

    expect(contract).toEqual({
      objective: "Complete the Recon stage using allowed tools and structured reporting.",
      stageSystemPrompt: defaultStageSystemPromptTemplate,
      allowedToolIds: ["builtin-http-surface-assessment", "seed-http-recon", "builtin-content-discovery"],
      requiredEvidenceTypes: [],
      findingPolicy: expect.objectContaining({ taxonomy: "typed-core-v1" }),
      completionRule: {
        requireStageResult: true,
        requireToolCall: false,
        allowEmptyResult: true,
        minFindings: 0,
        requireReachableSurface: false,
        requireEvidenceBackedWeakness: false,
        requireOsiCoverageStatus: false,
        requireChainedFindings: false
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    });
  });

  it("normalizes arrays and invalid optional fields back to defaults", () => {
    const contract = normalizeWorkflowStageContract({
      label: "Validate",
      objective: "   ",
      allowedToolIds: ["builtin-http-surface-assessment", "seed-http-recon", "", "builtin-content-discovery"],
      requiredEvidenceTypes: ["http", "http", "", "headers"],
      resultSchemaVersion: 0,
      handoffSchema: [] as unknown as null
    });

    expect(contract.objective).toBe("Complete the Validate stage using allowed tools and structured reporting.");
    expect(contract.stageSystemPrompt).toBe(defaultStageSystemPromptTemplate);
    expect(contract.allowedToolIds).toEqual(["builtin-http-surface-assessment", "seed-http-recon", "builtin-content-discovery"]);
    expect(contract.requiredEvidenceTypes).toEqual(["http", "headers"]);
    expect(contract.resultSchemaVersion).toBe(1);
    expect(contract.handoffSchema).toBeNull();
  });
});
