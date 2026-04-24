import { loadSeedToolScript } from "../load-script.js";

export const checksecTool = {
  id: "seed-checksec",
  name: "Checksec",
  description: "Check executable properties.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/checksec.sh");
  },
  capabilities: ["binary-analysis","security-headers"],
  binary: "checksec",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Checksec for seeded execution.",
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
