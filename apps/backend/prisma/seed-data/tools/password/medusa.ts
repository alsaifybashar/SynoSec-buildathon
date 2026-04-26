import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const medusaTool = {
  id: "seed-medusa",
  name: "Medusa",
  description: "Run bounded modular online credential validation against an approved service. Use when a specific protocol and credential candidate set are in scope. Provide target, service, port, candidate credentials, and max attempts. Returns login-attempt observations; do not use for discovery or unbounded attacks.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/medusa.sh");
  },
  capabilities: ["brute-force","password"],
  binary: "medusa",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Medusa.",
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
