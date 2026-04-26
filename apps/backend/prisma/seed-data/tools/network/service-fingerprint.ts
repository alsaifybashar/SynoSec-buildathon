import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const serviceFingerprintTool = {
  id: "seed-service-fingerprint",
  name: "Service Fingerprint",
  description: "Run deeper service and version fingerprinting on known open ports and extract CPE-like identifiers for correlation. Use after initial port discovery when version evidence matters. Provide `target` and port or candidate ports. Returns banner/version observations; do not treat CPE matches alone as confirmed vulnerabilities.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/service-fingerprint.sh");
  },
  capabilities: ["topology", "service-fingerprint", "service-enum", "cpe", "cve-correlation"],
  binary: "nmap",
  category: "topology" as const,
  riskTier: "passive" as const,
  notes: "Uses nmap -sV --version-all with XML output to retain service CPEs.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      ...seededPortSteeringProperties,
      ports: { type: "string" },
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
