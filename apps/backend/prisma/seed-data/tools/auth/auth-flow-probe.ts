import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const authFlowProbeTool = {
  id: "seed-auth-flow-probe",
  name: "Auth Flow Probe",
  description: "Test known authentication flows for weak controls such as missing rate limits, response differences, timing oracles, artifact acceptance, and weak-password acceptance signals. Use only against approved login or session endpoints. Provide `baseUrl`, `url`, `loginUrl`, or validation targets plus notes. Returns auth behavior observations; do not use for unbounded credential attacks.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/auth/auth-flow-probe.sh");
  },
  capabilities: ["auth", "session", "login", "rate-limit", "timing-oracle"],
  binary: "node",
  category: "auth" as const,
  riskTier: "active" as const,
  notes: "Sends bounded login attempts to approved targets; use only inside authorized scope.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 60000,
  inputSchema: {
    type: "object",
    properties: {
      ...seededWebSteeringProperties,
      loginUrl: { type: "string" },
      baseUrl: { type: "string" },
      target: { type: "string" },
      usernameField: { type: "string", default: "username" },
      passwordField: { type: "string", default: "password" },
      knownUser: { type: "string", default: "admin" },
      unknownUser: { type: "string", default: "synosec-nonexistent-user" }
    },
    required: ["baseUrl"]
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
