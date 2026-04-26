import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const tlsAuditTool = {
  id: "seed-tls-audit",
  name: "TLS Audit",
  description: "Check TLS protocol support, weak ciphers, certificate trust, expiry, hostname fit, and plaintext transport signals for a target host and port. Use when TLS posture evidence is needed. Provide `target` and optional `port`. Returns TLS observations; do not use for non-TLS service enumeration.",
  category: "topology" as const,
  riskTier: "passive" as const,
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/tls-audit.sh");
  },
  capabilities: ["topology", "tls", "ssl", "certificate-audit", "trust-boundary"],
  binary: "openssl",
  notes: "Passive TLS posture audit for L4/L6 boundary assessment.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 90000,
  inputSchema: {
    type: "object",
    properties: seededPortSteeringProperties,
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
