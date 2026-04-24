import { loadSeedToolScript } from "../load-script.js";

export const dNSenumTool = {
  id: "seed-dnsenum",
  name: "DNSenum",
  description: "Multi-threaded dns enumeration tool.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/subdomain/dnsenum.sh");
  },
  capabilities: ["subdomain-enum","dns"],
  binary: "dnsenum",
  category: "subdomain" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around DNSenum for seeded execution.",
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
