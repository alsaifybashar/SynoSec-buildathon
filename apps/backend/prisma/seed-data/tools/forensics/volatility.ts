import { loadSeedToolScript } from "../load-script.js";

export const volatilityTool = {
  id: "seed-volatility",
  name: "Volatility",
  description: "Analyze a memory image for processes, network connections, loaded modules, credentials, and volatile compromise evidence. Use for memory-forensics artifacts. Provide `filePath` and optional profile or notes. Returns memory observations; do not use for disk carving.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/volatility.sh");
  },
  capabilities: ["memory-forensics","forensics"],
  binary: "volatility",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Volatility.",
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
