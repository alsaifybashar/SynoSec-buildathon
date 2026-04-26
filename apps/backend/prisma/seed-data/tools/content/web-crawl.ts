import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringInputSchema } from "../shared/seeded-web-input-schema.js";

export const webCrawlTool = {
  id: "seed-web-crawl",
  name: "Web Crawl",
  description: "Crawl a confirmed web target to expand reachable pages, links, forms, and candidate endpoints. Use after HTTP surface assessment when route structure is needed. Provide `target` and `baseUrl`; optionally bound with candidate endpoints or page limits. Returns URL observations; do not use for brute-force path guessing or exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/web-crawl.sh");
  },
  capabilities: ["web-recon", "content-discovery", "passive"],
  binary: "node",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Useful for orchestrator planning and pen-test discovery.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: seededWebSteeringInputSchema,
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" }
    },
    required: ["output"]
  }
} as const;
