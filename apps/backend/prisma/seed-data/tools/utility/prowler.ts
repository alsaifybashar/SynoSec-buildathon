import { loadSeedToolScript } from "../load-script.js";
import { seededContextSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const prowlerTool = {
  id: "seed-prowler",
  name: "Prowler",
  description: "Audit AWS account posture for identity, logging, exposure, hardening, and best-practice weaknesses. Use only when AWS context and authorization are available. Provide account or profile context and notes. Returns cloud posture observations; do not use for network exploitation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/prowler.sh");
  },
  capabilities: ["cloud","aws","security-audit"],
  binary: "prowler",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Prowler.",
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
