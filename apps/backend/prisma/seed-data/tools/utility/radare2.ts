import { loadSeedToolScript } from "../load-script.js";

export const radare2Tool = {
  id: "seed-radare2",
  name: "Radare2",
  description: "Unix-like reverse engineering framework and command-line toolset.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/radare2.sh");
  },
  capabilities: ["reversing","analysis"],
  binary: "r2",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Radare2 for seeded execution.",
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
