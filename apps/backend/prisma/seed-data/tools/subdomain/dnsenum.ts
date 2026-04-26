import { loadSeedToolScript } from "../load-script.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const dNSenumTool = {
  id: "seed-dnsenum",
  name: "DNSenum",
  description: "Enumerate DNS records and related domain data for an in-scope domain. Use to collect NS, MX, A, TXT, and brute-force-adjacent clues before service validation. Provide `target` or domain. Returns DNS observations; do not use for exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/dnsenum.sh");
  },
  capabilities: ["subdomain-enum","dns"],
  binary: "dnsenum",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for DNSenum.",
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
