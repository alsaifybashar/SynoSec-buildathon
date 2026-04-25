import { loadSeedToolScript } from "../load-script.js";

export const tlsAuditTool = {
  id: "seed-tls-audit",
  name: "TLS Audit",
  description: "Checks TLS protocols, weak cipher support, and certificate trust signals for a target host and port.",
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
    properties: {
      target: { type: "string" },
      port: { type: "number", default: 443 },
      baseUrl: { type: "string" }
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
