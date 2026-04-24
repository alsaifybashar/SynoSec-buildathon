import { loadSeedToolScript } from "../load-script.js";

export const webCrawlTool = {
  id: "seed-web-crawl",
  name: "Web Crawl",
  description: "Crawl discovered web targets to expand reachable content and endpoints.",
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
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: ["target", "baseUrl"]
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" }
    },
    required: ["output"]
  }
} as const;
