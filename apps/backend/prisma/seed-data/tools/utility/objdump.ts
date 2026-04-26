import { loadSeedToolScript } from "../load-script.js";

export const objdumpTool = {
  id: "seed-objdump",
  name: "Objdump",
  description: "Inspect object-file headers, sections, symbols, and disassembly-oriented metadata for a local binary. Use during static reverse-engineering triage. Provide `filePath`. Returns binary structure observations; it does not execute the artifact.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/objdump.sh");
  },
  capabilities: ["binary-analysis","reversing"],
  binary: "objdump",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Objdump.",
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
