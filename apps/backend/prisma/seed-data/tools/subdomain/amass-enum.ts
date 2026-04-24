import { loadSeedToolScript } from "../load-script.js";

export const amassEnumTool = {
  id: "seed-amass-enum",
  name: "Amass Enumeration",
  description: "Enumerate subdomains for a domain using passive Amass mode.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/amass-enum.sh");
  },
  capabilities: ["subdomain-enum", "passive", "osint"],
  binary: "amass",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Amass passive mode for seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
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
