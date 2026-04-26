import { loadSeedToolScript } from "../load-script.js";

export const exifToolTool = {
  id: "seed-exiftool",
  name: "ExifTool",
  description: "Read metadata from a local file or collected artifact, including timestamps, authoring data, device hints, and format-specific fields. Use for metadata extraction only. Provide `filePath`. Returns metadata observations; do not use to modify files.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/exiftool.sh");
  },
  capabilities: ["metadata","forensics"],
  binary: "exiftool",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for ExifTool.",
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
