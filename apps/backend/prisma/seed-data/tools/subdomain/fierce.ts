import { loadSeedToolScript } from "../load-script.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const fierceTool = {
  id: "seed-fierce",
  name: "Fierce",
  description: "Perform DNS reconnaissance to locate related hostnames and non-contiguous IP space for an in-scope domain. Use when topology or ownership clues matter. Provide `target` or domain. Returns DNS/host observations; validate scope and reachability before follow-up scans.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/fierce.sh");
  },
  capabilities: ["subdomain-enum","dns"],
  binary: "fierce",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Fierce.",
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
