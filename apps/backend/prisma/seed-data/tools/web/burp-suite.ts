import { loadSeedToolScript } from "../load-script.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const burpSuiteTool = {
  id: "seed-burp-suite",
  name: "Burp Suite",
  description: "Represent a Burp-style web assessment step for a known application surface. Use when interactive or proxy-assisted web validation is explicitly part of the workflow. Provide target URL and notes describing the intended check. Returns recorded assessment output or observations; do not use as a generic automated scanner substitute.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/burp-suite.sh");
  },
  capabilities: ["proxy","vuln-scan","web"],
  binary: "burp",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Burp Suite.",
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
