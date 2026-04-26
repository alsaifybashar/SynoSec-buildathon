import { createSeededAgentActionTool } from "./create-agent-action-tool.js";
import { httpReconTool } from "../web/http-recon.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const agentHttpSurfaceAssessmentTool = createSeededAgentActionTool({
  id: "seed-agent-http-surface-assessment",
  name: "HTTP Surface Assessment",
  description: "Assess known HTTP or HTTPS endpoints without crawling or guessing paths. Use this as the first web action when you need reachability, status code, redirects, title, headers, cookies, and lightweight technology hints. Provide `baseUrl`; optionally steer with `candidateEndpoints`, `maxEndpoints`, `notes`, or `hypotheses`. Returns raw output plus observations suitable for evidence quotes. Do not use it to discover hidden content, enumerate links, or validate vulnerabilities.",
  capabilities: ["agent-action", "http-surface", "passive"],
  binary: "httpx",
  category: "web",
  riskTier: "passive",
  notes: "Agent-facing action for HTTP surface assessment. Failures are reported directly; no alternate tool is selected.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 10000,
  inputSchema: {
    type: "object",
    properties: seededPassiveHttpSteeringProperties,
    required: ["baseUrl"]
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
    name: httpReconTool.name,
    bashSource: httpReconTool.bashSource
  }
});
