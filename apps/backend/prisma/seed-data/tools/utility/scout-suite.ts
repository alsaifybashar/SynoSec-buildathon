import { loadSeedToolScript } from "../load-script.js";
import { seededContextSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const scoutSuiteTool = {
  id: "seed-scout-suite",
  name: "Scout Suite",
  description: "Audit cloud account posture across supported providers for configuration, identity, network exposure, and logging weaknesses. Use when cloud credentials or scoped account context are available. Provide provider/account context and notes. Returns posture observations; do not use for exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/scout-suite.sh");
  },
  capabilities: ["cloud","security-audit"],
  binary: "scout",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Scout Suite.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededContextSteeringProperties
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
