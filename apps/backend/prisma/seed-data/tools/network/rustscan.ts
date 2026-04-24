import { loadSeedToolScript } from "../load-script.js";

export const rustScanTool = {
  id: "seed-rustscan",
  name: "RustScan",
  description: "Fast Port Scanner built with Rust.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/rustscan.sh");
  },
  capabilities: ["port-scan","network"],
  binary: "rustscan",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around RustScan for seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    }
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
