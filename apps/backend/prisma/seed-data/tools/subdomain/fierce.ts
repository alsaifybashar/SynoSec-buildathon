import { loadSeedToolScript } from "../load-script.js";

export const fierceTool = {
  id: "seed-fierce",
  name: "Fierce",
  description: "DNS reconnaissance tool for locating non-contiguous IP space.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/fierce.sh");
  },
  capabilities: ["subdomain-enum","dns"],
  binary: "fierce",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Fierce for seeded execution.",
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
