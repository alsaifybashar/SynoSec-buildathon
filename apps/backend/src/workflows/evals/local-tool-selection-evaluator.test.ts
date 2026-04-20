import { describe, expect, it } from "vitest";
import { parseToolSelectionResponse } from "@/workflows/evals/local-tool-selection-evaluator.js";

describe("local tool selection evaluator", () => {
  it("parses strict JSON output", () => {
    expect(
      parseToolSelectionResponse('{"selectedToolIds":["seed-http-recon","seed-web-crawl"],"reason":"passive first"}')
    ).toEqual({
      selectedToolIds: ["seed-http-recon", "seed-web-crawl"],
      reason: "passive first"
    });
  });

  it("extracts json content from wrapped model output", () => {
    expect(
      parseToolSelectionResponse('\n\n{"selectedToolIds":["seed-evidence-review"],"reason":"review first"}\n')
    ).toEqual({
      selectedToolIds: ["seed-evidence-review"],
      reason: "review first"
    });
  });

  it("throws when no json is present", () => {
    expect(() => parseToolSelectionResponse("not json")).toThrow(/did not contain json/i);
  });
});
