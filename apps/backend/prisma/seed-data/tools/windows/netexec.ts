import { loadSeedToolScript } from "../load-script.js";

export const netExecTool = {
  id: "seed-netexec",
  name: "NetExec",
  description: "Network execution tool.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/netexec.sh");
  },
  capabilities: ["windows","network","brute-force"],
  binary: "nxc",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around NetExec for seeded execution.",
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
