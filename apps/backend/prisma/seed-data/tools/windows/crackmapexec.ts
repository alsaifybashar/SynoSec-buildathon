import { loadSeedToolScript } from "../load-script.js";

export const crackMapExecTool = {
  id: "seed-crackmapexec",
  name: "CrackMapExec",
  description: "Swiss army knife for pentesting networks.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/crackmapexec.sh");
  },
  capabilities: ["windows","network","brute-force"],
  binary: "crackmapexec",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around CrackMapExec for seeded execution.",
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
