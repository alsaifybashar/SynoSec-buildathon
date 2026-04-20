import { describe, expect, it } from "vitest";
import type { Scan, ToolRequest } from "@synosec/contracts";
import { authorizeToolRequest } from "@/workflows/broker/policy.js";

function makeScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-1",
    scope: {
      targets: ["staging.synosec.local"],
      exclusions: [],
      layers: ["L3", "L4", "L7"],
      maxDepth: 3,
      maxDurationMinutes: 10,
      rateLimitRps: 5,
      allowActiveExploits: false,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "simulation" as const
    },
    status: "running",
    currentRound: 0,
    tacticsTotal: 1,
    tacticsComplete: 0,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function makeRequest(overrides: Partial<ToolRequest> = {}): ToolRequest {
  return {
    tool: "nmap",
    scriptPath: "scripts/tools/service-scan.sh",
    capabilities: ["network-recon", "passive"],
    target: "staging.synosec.local",
    layer: "L3",
    riskTier: "passive",
    justification: "test request",
    parameters: {},
    ...overrides
  };
}

describe("authorizeToolRequest", () => {
  it("allows in-scope passive requests", () => {
    const decision = authorizeToolRequest(makeScan(), makeRequest());

    expect(decision.allowed).toBe(true);
  });

  it("denies out-of-scope targets", () => {
    const decision = authorizeToolRequest(
      makeScan(),
      makeRequest({ target: "prod.synosec.local" })
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("outside");
  });

  it("denies controlled exploit requests when scan policy disallows them", () => {
    const decision = authorizeToolRequest(
      makeScan(),
      makeRequest({
        capabilities: ["content-discovery", "active-recon"],
        riskTier: "controlled-exploit",
        tool: "ffuf",
        layer: "L7"
      })
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("disabled");
  });

  it("allows active recon capabilities even without allowActiveExploits", () => {
    const decision = authorizeToolRequest(
      makeScan(),
      makeRequest({
        capabilities: ["vulnerability-audit", "active-recon"],
        riskTier: "active",
        tool: "ssh-audit",
        layer: "L5"
      })
    );

    expect(decision.allowed).toBe(true);
  });

  it("denies exploit capabilities when allowActiveExploits is false", () => {
    const decision = authorizeToolRequest(
      makeScan(),
      makeRequest({
        capabilities: ["database-security", "controlled-exploit"],
        riskTier: "active",
        tool: "sqlmap",
        layer: "L7"
      })
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("allowActiveExploits");
  });
});
