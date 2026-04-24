import { loadSeedToolScript } from "../load-script.js";

export const gDBTool = {
  id: "seed-gdb",
  name: "GDB",
  description: "The GNU Project Debugger.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/gdb.sh");
  },
  capabilities: ["debugging","reversing"],
  binary: "gdb",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around GDB for seeded execution.",
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
