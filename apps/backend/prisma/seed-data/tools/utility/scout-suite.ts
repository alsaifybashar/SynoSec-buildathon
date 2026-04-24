import { loadSeedToolScript } from "../load-script.js";

export const scoutSuiteTool = {
  id: "seed-scout-suite",
  name: "Scout Suite",
  description: "Multi-cloud security auditing tool.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/scout-suite.sh");
  },
  capabilities: ["cloud","security-audit"],
  binary: "scout",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Scout Suite for seeded execution.",
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
