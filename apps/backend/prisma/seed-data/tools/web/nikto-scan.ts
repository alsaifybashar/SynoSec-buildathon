import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const niktoScanTool = {
  id: "seed-nikto-scan",
  name: "Nikto Scan",
  description: "Check a known web server for common configuration issues, risky files, outdated server behavior, and known web-server weaknesses. Use after confirming the target is reachable. Provide `baseUrl` or `target`. Returns issue observations with evidence; do not use for broad crawling or exploit execution.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/nikto-scan.sh");
  },
  capabilities: ["web-recon", "active-recon", "vulnerability-audit"],
  binary: "nikto",
  category: "web" as const,
  riskTier: "active" as const,
  notes: "Raw adapter for Nikto web vulnerability checks.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: seededWebSteeringProperties,
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
