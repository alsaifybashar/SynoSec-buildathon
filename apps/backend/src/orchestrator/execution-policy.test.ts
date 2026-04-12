import { describe, expect, it } from "vitest";
import type { ScanScope } from "@synosec/contracts";
import {
  getInitialLayerForScope,
  getSupportedLayersForRun,
  normalizeScopeForRun,
  shouldRunSecondaryLlmPasses
} from "./execution-policy.js";

describe("execution policy", () => {
  const fullScope: ScanScope = {
    targets: ["localhost:8888"],
    exclusions: [],
    layers: ["L3", "L4", "L5", "L6", "L7"],
    maxDepth: 2,
    maxDurationMinutes: 5,
    rateLimitRps: 5,
    allowActiveExploits: false
  };

  it("keeps all layers for non-local runs", () => {
    expect(getSupportedLayersForRun({ provider: "anthropic" })).toEqual(["L3", "L4", "L5", "L6", "L7"]);
    expect(normalizeScopeForRun(fullScope, { provider: "anthropic" }).layers).toEqual([
      "L3",
      "L4",
      "L5",
      "L6",
      "L7"
    ]);
    expect(shouldRunSecondaryLlmPasses({ provider: "anthropic" })).toBe(true);
  });

  it("restricts local runs to tool-backed layers", () => {
    const normalized = normalizeScopeForRun(fullScope, { provider: "local" });
    expect(normalized.layers).toEqual(["L4", "L6", "L7"]);
    expect(getInitialLayerForScope(normalized)).toBe("L4");
    expect(shouldRunSecondaryLlmPasses({ provider: "local" })).toBe(false);
  });

  it("falls back to supported local layers when request includes only unsupported layers", () => {
    const normalized = normalizeScopeForRun(
      {
        ...fullScope,
        layers: ["L3", "L5"]
      },
      { provider: "local" }
    );

    expect(normalized.layers).toEqual(["L4", "L6", "L7"]);
  });
});
