import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const dalfoxTool = {
  id: "seed-dalfox",
  name: "Dalfox",
  description: "Validate reflected or parameter-driven XSS on known endpoints and parameters. Use after parameter discovery or crawl evidence identifies candidate sinks. Provide `url`, `baseUrl`, candidate endpoints, or candidate parameters. Returns payload/reflection evidence and observations; do not use for content discovery.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/dalfox.sh");
  },
  capabilities: ["xss","vuln-scan"],
  binary: "dalfox",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Dalfox.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededWebSteeringProperties
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
