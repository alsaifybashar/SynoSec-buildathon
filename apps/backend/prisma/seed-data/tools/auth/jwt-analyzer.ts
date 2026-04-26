import { loadSeedToolScript } from "../load-script.js";

export const jwtAnalyzerTool = {
  id: "seed-jwt-analyzer",
  name: "JWT Analyzer",
  description: "Analyze a supplied JWT offline for unsafe algorithms, weak HMAC secrets, missing claims, role-like artifacts, key IDs, and session lifetime issues. Provide `token`. Returns decoded-token observations and validation notes; it does not replay the token or prove server-side authorization bypass.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/auth/jwt-analyzer.sh");
  },
  capabilities: ["auth", "session", "jwt", "token-analysis"],
  binary: "node",
  category: "auth" as const,
  riskTier: "passive" as const,
  notes: "Offline JWT inspection. It does not contact the target.",
  sandboxProfile: "read-only-parser" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    properties: {
      token: { type: "string" },
      target: { type: "string" },
      notes: { type: "string" },
      hypotheses: { type: "string" }
    },
    required: ["token"]
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
