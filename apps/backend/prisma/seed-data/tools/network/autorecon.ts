import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const autoreconTool = {
  id: "seed-autorecon",
  name: "Autorecon",
  description: "Run automated multi-service reconnaissance against an approved host to collect initial service evidence and suggested follow-up areas. Use when a broader host-level enumeration pass is in scope. Provide `target`. Returns reconnaissance observations; do not use as exploit proof.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/autorecon.sh");
  },
  capabilities: ["recon","network"],
  binary: "autorecon",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Autorecon.",
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
