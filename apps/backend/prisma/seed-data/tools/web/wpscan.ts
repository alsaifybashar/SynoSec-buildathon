import { loadSeedToolScript } from "../load-script.js";

export const wPScanTool = {
  id: "seed-wpscan",
  name: "WPScan",
  description: "WordPress Security Scanner.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/wpscan.sh");
  },
  capabilities: ["vuln-scan","cms"],
  binary: "wpscan",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around WPScan for seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    }
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
