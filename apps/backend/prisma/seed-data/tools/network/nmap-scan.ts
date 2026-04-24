import { loadSeedToolScript } from "../load-script.js";

export const nmapScanTool = {
  id: "seed-nmap-scan",
  name: "Nmap Scan",
  description: "Run nmap against a target to discover open ports and service details.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/nmap-scan.sh");
  },
  capabilities: ["network-recon", "passive", "service-enum"],
  binary: "nmap",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around nmap for direct seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      port: { type: "number" },
      baseUrl: { type: "string" }
    },
    required: ["target"]
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
