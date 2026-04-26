import { describe, expect, it } from "vitest";
import {
  createDefaultWorkflowStageContract,
  defaultStageSystemPromptTemplate,
  normalizeWorkflowStageContract
} from "./workflow-stage-contract.js";

describe("workflow stage contracts", () => {
  it("creates stable defaults for early-stage workflows", () => {
    const contract = createDefaultWorkflowStageContract(
      { label: "Recon" },
      ["tool-a", "tool-a", "", "tool-b"]
    );

    expect(contract).toEqual({
      objective: "Complete the Recon stage using allowed tools and structured reporting.",
      stageSystemPrompt: defaultStageSystemPromptTemplate,
      allowedToolIds: ["tool-a", "tool-b"],
      requiredEvidenceTypes: [],
      findingPolicy: expect.objectContaining({ taxonomy: "typed-core-v1" }),
      completionRule: {
        requireStageResult: true,
        requireToolCall: false,
        allowEmptyResult: true,
        minFindings: 0
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    });
  });

  it("normalizes arrays and invalid optional fields back to defaults", () => {
    const contract = normalizeWorkflowStageContract({
      label: "Validate",
      objective: "   ",
      allowedToolIds: ["tool-x", "tool-x", "", "tool-y"],
      requiredEvidenceTypes: ["http", "http", "", "headers"],
      resultSchemaVersion: 0,
      handoffSchema: [] as unknown as null
    });

    expect(contract.objective).toBe("Complete the Validate stage using allowed tools and structured reporting.");
    expect(contract.stageSystemPrompt).toBe(defaultStageSystemPromptTemplate);
    expect(contract.allowedToolIds).toEqual(["tool-x", "tool-y"]);
    expect(contract.requiredEvidenceTypes).toEqual(["http", "headers"]);
    expect(contract.resultSchemaVersion).toBe(1);
    expect(contract.handoffSchema).toBeNull();
  });
});
