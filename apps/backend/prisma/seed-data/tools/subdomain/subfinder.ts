import { loadSeedToolScript } from "../load-script.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const subfinderTool = {
  id: "seed-subfinder",
  name: "Subfinder",
  description: "Run passive subdomain enumeration for an in-scope domain. Use before host or HTTP assessment to discover candidate hostnames. Provide `target` or domain context. Returns discovered subdomain observations; validate reachability separately.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/subfinder.sh");
  },
  capabilities: ["subdomain-enum","passive"],
  binary: "subfinder",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Subfinder.",
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
