import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const waybackurlsTool = {
  id: "seed-waybackurls",
  name: "Waybackurls",
  description: "Fetch known archived URLs for an in-scope domain from the Wayback Machine. Use for passive endpoint expansion before live validation. Provide `target` or domain context. Returns candidate URL observations; do not use as proof that a route currently exists.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/waybackurls.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "waybackurls",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Waybackurls.",
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
