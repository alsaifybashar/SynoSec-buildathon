import { loadSeedToolScript } from "../load-script.js";

export const sublist3rEnumTool = {
  id: "seed-sublist3r-enum",
  name: "Sublist3r Enumeration",
  description: "Enumerate subdomains for a domain using Sublist3r.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/sublist3r-enum.sh");
  },
  capabilities: ["subdomain-enum", "passive", "osint"],
  binary: "sublist3r",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Sublist3r for seeded subdomain enumeration.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      domain: { type: "string" },
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
