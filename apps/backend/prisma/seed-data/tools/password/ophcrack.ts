import { loadSeedToolScript } from "../load-script.js";

export const ophcrackTool = {
  id: "seed-ophcrack",
  name: "Ophcrack",
  description: "Run offline Windows hash recovery using Ophcrack-style rainbow table checks. Use only for captured Windows hash material inside the authorized lab boundary. Provide hash material or file context. Returns recovery observations; it does not contact Windows hosts.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/ophcrack.sh");
  },
  capabilities: ["password-cracking","windows"],
  binary: "ophcrack",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Ophcrack.",
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
