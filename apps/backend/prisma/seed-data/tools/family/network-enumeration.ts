import { createSeededFamilyTool } from "./create-family-tool.js";
import { nmapScanTool } from "../network/nmap-scan.js";
import { serviceScanTool } from "../network/service-scan.js";

export const familyNetworkEnumerationTool = createSeededFamilyTool({
  id: "seed-family-network-enumeration",
  name: "Network Enumeration",
  description: "Use this when you need port and service visibility for a host. Provide `target` and optional `port`. It checks reachable network services and returns concrete service-exposure evidence. Prefer this for host-level enumeration, not for web content discovery.",
  capabilities: ["semantic-family", "network-enumeration", "passive"],
  binary: "node",
  category: "network",
  riskTier: "passive",
  notes: "Semantic family wrapper over service scan with Nmap as the ordered fallback path.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      port: { type: "number" }
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
    name: serviceScanTool.name,
    bashSource: serviceScanTool.bashSource
  },
  fallback: {
    name: nmapScanTool.name,
    bashSource: nmapScanTool.bashSource
  }
});
