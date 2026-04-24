import { loadSeedToolScript } from "../load-script.js";

export const masscanTool = {
  id: "seed-masscan",
  name: "Masscan",
  description: "TCP port scanner, spews SYN packets asynchronously, scanning the entire Internet in under 5 minutes.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/masscan.sh");
  },
  capabilities: ["port-scan","network"],
  binary: "masscan",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Masscan for seeded execution.",
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
