import { loadSeedToolScript } from "../load-script.js";

export const scalpelTool = {
  id: "seed-scalpel",
  name: "Scalpel",
  description: "Frugal, high performance file carver.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/scalpel.sh");
  },
  capabilities: ["file-recovery","forensics"],
  binary: "scalpel",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Scalpel for seeded execution.",
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
