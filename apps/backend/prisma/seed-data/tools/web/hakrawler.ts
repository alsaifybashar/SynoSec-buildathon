import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const hakrawlerTool = {
  id: "seed-hakrawler",
  name: "Hakrawler",
  description: "Run a lightweight crawl of a confirmed web target to collect linked URLs and simple route evidence. Use for quick URL expansion when a full crawl is unnecessary. Provide `baseUrl`, `startUrl`, or `target`. Returns URL observations; do not use for brute-force discovery or vulnerability validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/hakrawler.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "hakrawler",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Hakrawler.",
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
