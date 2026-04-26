import { loadSeedToolScript } from "../load-script.js";

export const binwalkTool = {
  id: "seed-binwalk",
  name: "Binwalk",
  description: "Inspect a binary image or firmware-like artifact for embedded files, signatures, compressed data, and executable code. Use during artifact triage or firmware analysis. Provide `filePath`. Returns embedded-structure observations; it does not extract every artifact by itself.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/binwalk.sh");
  },
  capabilities: ["binary-analysis","extraction"],
  binary: "binwalk",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Binwalk.",
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
