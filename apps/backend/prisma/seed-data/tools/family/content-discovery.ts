import { createSeededFamilyTool } from "./create-family-tool.js";
import { contentDiscoveryTool } from "../content/content-discovery.js";
import { dirsearchTool } from "../web/dirsearch.js";

export const familyContentDiscoveryTool = createSeededFamilyTool({
  id: "seed-family-content-discovery",
  name: "Content Discovery Family",
  description: "Use this when you need likely hidden paths, panels, or API routes on a known web target. Provide `target` and `baseUrl`. It performs controlled path discovery and returns concrete content-exposure evidence. Prefer this for path guessing, not for simple HTTP fingerprinting.",
  capabilities: ["semantic-family", "content-discovery", "active-recon"],
  binary: "node",
  category: "content",
  riskTier: "active",
  notes: "Semantic family wrapper over seeded content discovery with Dirsearch as the ordered fallback path.",
  sandboxProfile: "active-recon",
  privilegeProfile: "active-network",
  timeoutMs: 10000,
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
