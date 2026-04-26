import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const rustScanTool = {
  id: "seed-rustscan",
  name: "RustScan",
  description: "Run fast bounded port discovery against an approved host. Use when you need quick open-port candidates before service enumeration. Provide `target` and optional candidate ports or limits. Returns port observations; do not use for vulnerability validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/rustscan.sh");
  },
  capabilities: ["port-scan","network"],
  binary: "rustscan",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for RustScan.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededPortSteeringProperties
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" },
      observations: { type: "array" }
    },
    required: ["output"]
  }
} as const;
