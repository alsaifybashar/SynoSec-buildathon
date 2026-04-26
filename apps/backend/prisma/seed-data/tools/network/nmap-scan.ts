import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const nmapScanTool = {
  id: "seed-nmap-scan",
  name: "Nmap Scan",
  description: "Run nmap-style service discovery against an approved target to identify open ports, service names, and version hints. Use after scope is confirmed and before deeper protocol validation. Provide `target` and optional `port` or candidate ports. Returns scan observations; do not use for exploitation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/nmap-scan.sh");
  },
  capabilities: ["network-recon", "passive", "service-enum"],
  binary: "nmap",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for direct nmap execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: seededPortSteeringProperties,
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
