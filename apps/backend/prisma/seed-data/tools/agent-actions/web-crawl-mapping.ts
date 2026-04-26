import { createSeededAgentActionTool } from "./create-agent-action-tool.js";
import { webCrawlTool } from "../content/web-crawl.js";
import { seededWebSteeringInputSchema } from "../shared/seeded-web-input-schema.js";

export const agentWebCrawlMappingTool = createSeededAgentActionTool({
  id: "seed-agent-web-crawl-mapping",
  name: "Web Crawl Mapping",
  description: "Map reachable in-scope URLs by following links and known entrypoints on a confirmed live web target. Use this after HTTP surface assessment when you need application structure, route relationships, forms, or candidate endpoints for later validation. Provide `target` and `baseUrl`; optionally steer with `candidateEndpoints`, `candidatePaths`, `maxPages`, and short `notes`. Returns crawled URLs and observations. Do not use it for brute-force path guessing or vulnerability confirmation.",
  capabilities: ["agent-action", "web-crawl", "passive"],
  binary: "node",
  category: "content",
  riskTier: "passive",
  notes: "Agent-facing action for web crawl mapping. Failures are reported directly; no alternate tool is selected.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 10000,
  inputSchema: seededWebSteeringInputSchema,
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
  }
});
