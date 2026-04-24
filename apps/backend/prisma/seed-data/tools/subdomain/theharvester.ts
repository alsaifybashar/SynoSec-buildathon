import { loadSeedToolScript } from "../load-script.js";

export const theHarvesterTool = {
  id: "seed-theharvester",
  name: "TheHarvester",
  description: "E-mail, subdomain and people names harvester.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/theharvester.sh");
  },
  capabilities: ["subdomain-enum","osint"],
  binary: "theHarvester",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around TheHarvester for seeded execution.",
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
