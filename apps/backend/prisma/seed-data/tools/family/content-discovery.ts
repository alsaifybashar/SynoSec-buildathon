import { createSeededFamilyTool } from "./create-family-tool.js";
import { contentDiscoveryTool } from "../content/content-discovery.js";
import { dirsearchTool } from "../web/dirsearch.js";

export const familyContentDiscoveryTool = createSeededFamilyTool({
  id: "seed-family-content-discovery",
  name: "Content Discovery Family",
  description: "Enumerate likely in-scope content paths through one semantic discovery family tool.",
  capabilities: ["semantic-family", "content-discovery", "active-recon"],
  binary: "node",
  category: "content",
  riskTier: "active",
  notes: "Semantic family wrapper over seeded content discovery with Dirsearch as the ordered fallback path.",
  sandboxProfile: "active-recon",
  privilegeProfile: "active-network",
  timeoutMs: 30000,
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
    name: contentDiscoveryTool.name,
    bashSource: contentDiscoveryTool.bashSource
  },
  fallback: {
    name: dirsearchTool.name,
    bashSource: dirsearchTool.bashSource
  }
});
