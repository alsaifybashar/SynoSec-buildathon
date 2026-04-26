import { loadSeedToolScript } from "../load-script.js";

export const gDBTool = {
  id: "seed-gdb",
  name: "GDB",
  description: "Run debugger-oriented inspection for a local binary or controlled process context. Use only when dynamic analysis is explicitly intended and safe. Provide `filePath`, optional arguments, or notes. Returns debugging observations; do not use for simple string or metadata extraction.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/gdb.sh");
  },
  capabilities: ["debugging","reversing"],
  binary: "gdb",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for GDB.",
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
