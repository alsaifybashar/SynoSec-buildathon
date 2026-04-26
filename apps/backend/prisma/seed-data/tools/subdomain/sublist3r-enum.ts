import { loadSeedToolScript } from "../load-script.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const sublist3rEnumTool = {
  id: "seed-sublist3r-enum",
  name: "Sublist3r Enumeration",
  description: "Enumerate likely subdomains for an in-scope domain using Sublist3r sources. Use for passive attack-surface expansion. Provide `target` or domain. Returns hostname observations; validate liveness separately.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/sublist3r-enum.sh");
  },
  capabilities: ["subdomain-enum", "passive", "osint"],
  binary: "sublist3r",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Sublist3r subdomain enumeration.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
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
