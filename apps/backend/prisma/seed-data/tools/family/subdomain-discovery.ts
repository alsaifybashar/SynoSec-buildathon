import { createSeededFamilyTool } from "./create-family-tool.js";
import { subfinderTool } from "../subdomain/subfinder.js";
import { theHarvesterTool } from "../subdomain/theharvester.js";

export const familySubdomainDiscoveryTool = createSeededFamilyTool({
  id: "seed-family-subdomain-discovery",
  name: "Subdomain Discovery",
  description: "Discover subdomains through one semantic passive-enumeration family tool.",
  capabilities: ["semantic-family", "subdomain-discovery", "passive"],
  binary: "subfinder",
  category: "subdomain",
  riskTier: "passive",
  notes: "Semantic family wrapper over Subfinder with theHarvester as the ordered fallback path.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: ["target"]
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
    name: subfinderTool.name,
    bashSource: subfinderTool.bashSource
  },
  fallback: {
    name: theHarvesterTool.name,
    bashSource: theHarvesterTool.bashSource
  }
});
