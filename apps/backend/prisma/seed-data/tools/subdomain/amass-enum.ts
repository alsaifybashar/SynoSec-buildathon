import { loadSeedToolScript } from "../load-script.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const amassEnumTool = {
  id: "seed-amass-enum",
  name: "Amass Enumeration",
  description: "Enumerate subdomains for an in-scope domain using passive Amass mode. Use to expand candidate hostnames without active probing. Provide `target` or domain context. Returns subdomain observations; do not treat results as reachable until validated.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/amass-enum.sh");
  },
  capabilities: ["subdomain-enum", "passive", "osint"],
  binary: "amass",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Amass passive mode.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededSubdomainSteeringProperties
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
