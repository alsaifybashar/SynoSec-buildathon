import { loadSeedToolScript } from "../load-script.js";

export const binwalkTool = {
  id: "seed-binwalk",
  name: "Binwalk",
  description: "Tool for searching a given binary image for embedded files and executable code.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/binwalk.sh");
  },
  capabilities: ["binary-analysis","extraction"],
  binary: "binwalk",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Binwalk for seeded execution.",
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
