import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const katanaTool = {
  id: "seed-katana",
  name: "Katana",
  description: "Crawl a confirmed web target to discover reachable URLs, forms, scripts, and route structure. Use when link traversal is needed after HTTP surface assessment. Provide `baseUrl`, `startUrl`, or `target`; optionally bound the crawl with limits or candidate endpoints. Returns crawled URL observations; do not use for brute-force path guessing or vulnerability validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/katana.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "katana",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Katana.",
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
