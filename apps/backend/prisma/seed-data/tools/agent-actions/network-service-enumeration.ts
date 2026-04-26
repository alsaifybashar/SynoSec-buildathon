import { createSeededAgentActionTool } from "./create-agent-action-tool.js";
import { serviceScanTool } from "../network/service-scan.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const agentNetworkServiceEnumerationTool = createSeededAgentActionTool({
  id: "seed-agent-network-service-enumeration",
  name: "Network Service Enumeration",
  description: "Enumerate reachable network services for a host to establish non-HTTP and HTTP-adjacent attack surface. Use this when you need open ports, service names, banners, or version hints before deciding which protocol-specific action to run next. Provide `target`; include `port` or ordered `candidatePorts` with `maxPorts` to focus suspected service hops. Returns service-exposure output and observations with port-level evidence. Do not use it for web path discovery, subdomain discovery, or exploit validation.",
  capabilities: ["agent-action", "network-service-enumeration", "passive"],
  binary: "node",
  category: "network",
  riskTier: "passive",
  notes: "Agent-facing action for network service enumeration. Failures are reported directly; no alternate tool is selected.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 10000,
  inputSchema: {
    type: "object",
    properties: seededPortSteeringProperties,
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
    name: serviceScanTool.name,
    bashSource: serviceScanTool.bashSource
  }
});
