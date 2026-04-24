import { loadSeedToolScript } from "../load-script.js";

export const subfinderTool = {
  id: "seed-subfinder",
  name: "Subfinder",
  description: "Fast passive subdomain enumeration tool.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/subfinder.sh");
  },
  capabilities: ["subdomain-enum","passive"],
  binary: "subfinder",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Subfinder for seeded execution.",
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
