import { loadSeedToolScript } from "../load-script.js";

export const autoreconTool = {
  id: "seed-autorecon",
  name: "Autorecon",
  description: "Multi-threaded network reconnaissance tool which performs automated enumeration of services.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/autorecon.sh");
  },
  capabilities: ["recon","network"],
  binary: "autorecon",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Autorecon for seeded execution.",
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
