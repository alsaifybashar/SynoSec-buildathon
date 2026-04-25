import { createSeededFamilyTool } from "./create-family-tool.js";
import { webCrawlTool } from "../content/web-crawl.js";
import { katanaTool } from "../web/katana.js";

export const familyWebCrawlTool = createSeededFamilyTool({
  id: "seed-family-web-crawl",
  name: "Web Crawl Family",
  description: "Use this after confirming a live web target when you need more reachable in-scope URLs. Provide `target` and `baseUrl`. It follows links and expands the known page set for later evidence collection. Prefer this for link traversal, not for brute-force path guessing.",
  capabilities: ["semantic-family", "web-crawl", "passive"],
  binary: "node",
  category: "content",
  riskTier: "passive",
  notes: "Semantic family wrapper over the seeded web crawl with Katana as the ordered fallback path.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
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
      output: { type: "string" },
      observations: { type: "array" }
    },
    required: ["output"]
  },
  primary: {
    name: webCrawlTool.name,
    bashSource: webCrawlTool.bashSource
  },
  fallback: {
    name: katanaTool.name,
    bashSource: katanaTool.bashSource
  }
});
