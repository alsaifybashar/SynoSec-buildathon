import { loadSeedToolScript } from "../load-script.js";

export const checksecTool = {
  id: "seed-checksec",
  name: "Checksec",
  description: "Check a local executable for hardening properties such as NX, PIE, RELRO, stack canaries, and fortify signals. Use during binary triage. Provide `filePath`. Returns hardening observations; it does not execute or exploit the binary.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/checksec.sh");
  },
  capabilities: ["binary-analysis","security-headers"],
  binary: "checksec",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Checksec.",
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
