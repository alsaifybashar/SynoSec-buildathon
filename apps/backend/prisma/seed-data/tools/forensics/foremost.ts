import { loadSeedToolScript } from "../load-script.js";

export const foremostTool = {
  id: "seed-foremost",
  name: "Foremost",
  description: "Recover files from forensic material based on headers, footers, and internal structures. Use when disk images or binary blobs may contain embedded or deleted files. Provide `filePath`. Returns carving observations and recovered-file summaries; do not use for memory analysis.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/foremost.sh");
  },
  capabilities: ["file-recovery","forensics"],
  binary: "foremost",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Foremost.",
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
