import { loadSeedToolScript } from "../load-script.js";

export const ghidraTool = {
  id: "seed-ghidra",
  name: "Ghidra",
  description: "Software reverse engineering (SRE) framework.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/ghidra.sh");
  },
  capabilities: ["reversing","decompilation"],
  binary: "ghidra",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Ghidra for seeded execution.",
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
