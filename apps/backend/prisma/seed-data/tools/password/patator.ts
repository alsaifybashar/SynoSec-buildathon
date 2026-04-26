import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const patatorTool = {
  id: "seed-patator",
  name: "Patator",
  description: "Run bounded protocol-specific credential or input validation against an approved target. Use only with explicit scope, known service context, and constrained candidates. Provide target, protocol, port, candidate credentials, and max attempts. Returns attempt evidence; do not use for broad brute forcing.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/patator.sh");
  },
  capabilities: ["brute-force","password"],
  binary: "patator",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Patator.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededCredentialSteeringProperties
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
