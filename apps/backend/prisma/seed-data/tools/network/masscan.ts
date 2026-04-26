import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const masscanTool = {
  id: "seed-masscan",
  name: "Masscan",
  description: "Run high-speed TCP port discovery against explicitly approved scope. Use only when broad port discovery is authorized and rate constraints allow it. Provide target or scoped network context plus limits. Returns open-port observations; do not use for service fingerprinting or exploitation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/masscan.sh");
  },
  capabilities: ["port-scan","network"],
  binary: "masscan",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Masscan.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededPortSteeringProperties
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
