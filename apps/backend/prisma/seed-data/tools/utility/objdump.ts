import { loadSeedToolScript } from "../load-script.js";

export const objdumpTool = {
  id: "seed-objdump",
  name: "Objdump",
  description: "Display information from object files.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/objdump.sh");
  },
  capabilities: ["binary-analysis","reversing"],
  binary: "objdump",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Objdump for seeded execution.",
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
