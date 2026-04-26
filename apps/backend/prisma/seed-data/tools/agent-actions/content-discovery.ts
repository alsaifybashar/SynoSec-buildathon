import { createSeededAgentActionTool } from "./create-agent-action-tool.js";
import { contentDiscoveryTool } from "../content/content-discovery.js";
import { seededWebSteeringInputSchema } from "../shared/seeded-web-input-schema.js";

export const agentContentDiscoveryTool = createSeededAgentActionTool({
  id: "seed-agent-content-discovery",
  name: "Content Discovery",
  description: "Discover likely hidden paths, panels, API routes, and other addressable content on an already confirmed web target. Use this when path guessing is appropriate and in scope, not for passive fingerprinting or link traversal. Provide `target` and `baseUrl`; optionally narrow the run with `candidatePaths`, `candidateEndpoints`, `maxPaths`, and short `notes`. Returns discovered paths, response status evidence, and observations that can support content-exposure findings.",
  capabilities: ["agent-action", "content-discovery", "active-recon"],
  binary: "node",
  category: "content",
  riskTier: "active",
  notes: "Agent-facing action for content discovery. Failures are reported directly; no alternate tool is selected.",
  sandboxProfile: "active-recon",
  privilegeProfile: "active-network",
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
    name: contentDiscoveryTool.name,
    bashSource: contentDiscoveryTool.bashSource
  }
});
