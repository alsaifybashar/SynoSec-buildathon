import { loadSeedToolScript } from "../load-script.js";

export const patatorTool = {
  id: "seed-patator",
  name: "Patator",
  description: "Multi-purpose brute-forcer.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/patator.sh");
  },
  capabilities: ["brute-force","password"],
  binary: "patator",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Patator for seeded execution.",
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
