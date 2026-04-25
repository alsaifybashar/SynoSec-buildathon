import { loadSeedToolScript } from "../load-script.js";

export const serviceFingerprintTool = {
  id: "seed-service-fingerprint",
  name: "Service Fingerprint",
  description: "Runs deep nmap service/version detection and extracts CPE identifiers for CVE correlation.",
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
      target: { type: "string" },
      port: { type: "number" },
      ports: { type: "string" },
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
