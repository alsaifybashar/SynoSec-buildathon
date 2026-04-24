import { loadSeedToolScript } from "../load-script.js";

export const volatilityTool = {
  id: "seed-volatility",
  name: "Volatility",
  description: "Advanced memory forensics framework.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/volatility.sh");
  },
  capabilities: ["memory-forensics","forensics"],
  binary: "volatility",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Volatility for seeded execution.",
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
