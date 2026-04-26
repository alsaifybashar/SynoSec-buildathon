import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const hydraTool = {
  id: "seed-hydra",
  name: "Hydra",
  description: "Run bounded online credential validation against an explicitly approved network service. Use only when weak-credential testing is in scope and rate limits are set. Provide target, protocol or service, port, usernames/passwords, and max attempts. Returns attempt evidence; do not use for unbounded brute forcing.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/hydra.sh");
  },
  capabilities: ["brute-force","password"],
  binary: "hydra",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Hydra.",
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
