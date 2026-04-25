import { describe, expect, it } from "vitest";
import type { Scan, ToolRequest } from "@synosec/contracts";
import { authorizeToolRequest } from "./policy.js";

const scan: Scan = {
  id: "scan-1",
  scope: {
    targets: ["http://localhost:8888"],
    exclusions: [],
    trustZones: [],
    connectivity: [],
    layers: ["L4", "L7"],
    maxDepth: 2,
    maxDurationMinutes: 5,
    rateLimitRps: 5,
    allowActiveExploits: false,
    graceEnabled: true,
    graceRoundInterval: 3,
    cyberRangeMode: "simulation"
  },
  status: "running",
  currentRound: 0,
  tacticsTotal: 1,
  tacticsComplete: 0,
  createdAt: "2026-04-21T00:00:00.000Z"
};

const request: ToolRequest = {
  tool: "seed-service-scan",
  executorType: "bash",
  capabilities: ["network-recon"],
  target: "localhost",
  layer: "L4",
  riskTier: "passive",
  justification: "probe target reachability",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  parameters: {
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    commandPreview: "seed-service-scan target=localhost",
    toolInput: {
      target: "http://localhost:8888/"
    }
  }
};

describe("authorizeToolRequest", () => {
  it("treats host-only requests as in scope for URL-based targets", () => {
    const result = authorizeToolRequest(scan, request);

    expect(result.allowed).toBe(true);
  });
});
