import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const gauTool = {
  id: "seed-gau",
  name: "Gau",
  description: "Fetch historically observed URLs for an in-scope domain from passive archive sources. Use to expand candidate endpoints without actively crawling the live site. Provide `target`, domain, or `baseUrl`. Returns archived URL observations; do not treat archived URLs as currently reachable until validated.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/gau.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "gau",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Gau.",
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
