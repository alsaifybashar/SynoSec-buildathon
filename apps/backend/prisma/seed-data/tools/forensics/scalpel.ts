import { loadSeedToolScript } from "../load-script.js";

export const scalpelTool = {
  id: "seed-scalpel",
  name: "Scalpel",
  description: "Carve files from forensic material using configured file signatures. Use when a disk image or binary artifact may contain recoverable files. Provide `filePath`. Returns carving observations; do not use for metadata-only inspection.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/scalpel.sh");
  },
  capabilities: ["file-recovery","forensics"],
  binary: "scalpel",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Scalpel.",
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
