import { createSeededAgentActionTool } from "./create-agent-action-tool.js";
import { subfinderTool } from "../subdomain/subfinder.js";
import { seededSubdomainSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const agentSubdomainDiscoveryTool = createSeededAgentActionTool({
  id: "seed-agent-subdomain-discovery",
  name: "Subdomain Discovery",
  description: "Discover likely subdomains for in-scope domains using passive expansion. Use this when the target is a domain and you need candidate hosts before host, HTTP, or service assessment. Provide `target` or `domain`; optionally steer with `candidateDomains`, `knownSubdomains`, `maxResults`, `notes`, or `hypotheses`. Returns discovered hostnames and observations that can expand the attack surface. Do not use it for single-host HTTP validation, port scanning, or vulnerability confirmation.",
  capabilities: ["agent-action", "subdomain-discovery", "passive"],
  binary: "subfinder",
  category: "subdomain",
  riskTier: "passive",
  notes: "Agent-facing action for subdomain discovery. Failures are reported directly; no alternate tool is selected.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 10000,
  inputSchema: {
    type: "object",
    properties: seededSubdomainSteeringProperties,
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
  }
});
