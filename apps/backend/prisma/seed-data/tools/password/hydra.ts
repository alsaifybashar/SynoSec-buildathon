import { loadSeedToolScript } from "../load-script.js";

export const hydraTool = {
  id: "seed-hydra",
  name: "Hydra",
  description: "Parallelized network login cracker.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/hydra.sh");
  },
  capabilities: ["brute-force","password"],
  binary: "hydra",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Hydra for seeded execution.",
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
