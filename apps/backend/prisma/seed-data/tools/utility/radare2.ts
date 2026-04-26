import { loadSeedToolScript } from "../load-script.js";

export const radare2Tool = {
  id: "seed-radare2",
  name: "Radare2",
  description: "Run radare2-style static or scripted reverse-engineering analysis on a local binary. Use when deeper binary inspection is needed after triage. Provide `filePath` and optional notes or analysis command context. Returns analysis observations; do not use for basic metadata extraction.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/radare2.sh");
  },
  capabilities: ["reversing","analysis"],
  binary: "r2",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Radare2.",
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
