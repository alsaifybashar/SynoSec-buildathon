import { loadSeedToolScript } from "../load-script.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const wPScanTool = {
  id: "seed-wpscan",
  name: "WPScan",
  description: "Assess a confirmed WordPress site for core version, plugin, theme, user, and configuration weaknesses. Use only when HTTP fingerprinting indicates WordPress. Provide `baseUrl` or `target`. Returns WordPress-specific observations; do not use for non-WordPress targets.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/wpscan.sh");
  },
  capabilities: ["vuln-scan","cms"],
  binary: "wpscan",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for WPScan.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededPassiveHttpSteeringProperties
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
