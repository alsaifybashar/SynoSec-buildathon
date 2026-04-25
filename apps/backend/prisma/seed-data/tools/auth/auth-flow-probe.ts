import { loadSeedToolScript } from "../load-script.js";

export const authFlowProbeTool = {
  id: "seed-auth-flow-probe",
  name: "Auth Flow Probe",
  description: "Tests login flows for missing rate limiting, response differences, timing oracles, and weak-password acceptance signals.",
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
      loginUrl: { type: "string" },
      baseUrl: { type: "string" },
      target: { type: "string" },
      usernameField: { type: "string", default: "username" },
      passwordField: { type: "string", default: "password" },
      knownUser: { type: "string", default: "admin" },
      unknownUser: { type: "string", default: "synosec-nonexistent-user" }
    },
    required: ["target"]
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
