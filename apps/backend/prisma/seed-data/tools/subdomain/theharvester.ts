import { loadSeedToolScript } from "../load-script.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const theHarvesterTool = {
  id: "seed-theharvester",
  name: "TheHarvester",
  description: "Collect passive OSINT signals such as subdomains and related public identifiers for an in-scope domain. Use early in domain reconnaissance. Provide `target` or domain. Returns candidate observations; do not use as proof of service exposure without validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/theharvester.sh");
  },
  capabilities: ["subdomain-enum","osint"],
  binary: "theHarvester",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for TheHarvester.",
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
