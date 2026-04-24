import { loadSeedToolScript } from "../load-script.js";

export const foremostTool = {
  id: "seed-foremost",
  name: "Foremost",
  description: "Console program to recover files based on their headers, footers, and internal data structures.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/foremost.sh");
  },
  capabilities: ["file-recovery","forensics"],
  binary: "foremost",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Foremost for seeded execution.",
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
