import { loadSeedToolScript } from "../load-script.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const whatWebTool = {
  id: "seed-whatweb",
  name: "WhatWeb",
  description: "Fingerprint a known website for technologies, frameworks, plugins, headers, and platform hints. Use after confirming the site is reachable and before choosing technology-specific validation. Provide `baseUrl` or `target`. Returns fingerprint observations; do not use for crawling, path discovery, or exploit confirmation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/whatweb.sh");
  },
  capabilities: ["recon","fingerprinting"],
  binary: "whatweb",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for WhatWeb.",
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
