import { loadSeedToolScript } from "../load-script.js";

export const niktoScanTool = {
  id: "seed-nikto-scan",
  name: "Nikto Scan",
  description: "Run Nikto against a target URL to identify common web server weaknesses.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/nikto-scan.sh");
  },
  capabilities: ["web-recon", "active-recon", "vulnerability-audit"],
  binary: "nikto",
  category: "web" as const,
  riskTier: "active" as const,
  notes: "Wrapper around Nikto for seeded web vulnerability checks.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
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
