import { loadSeedToolScript } from "../load-script.js";

export const networkSegmentMapTool = {
  id: "seed-network-segment-map",
  name: "Network Segment Map",
  description: "Discovers adjacent hosts, inferred subnets, and gateway-facing ports for trust-boundary mapping.",
  category: "topology" as const,
  riskTier: "passive" as const,
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/network-segment-map.sh");
  },
  capabilities: ["topology", "network-discovery", "lateral-recon", "trust-boundary"],
  binary: "nmap",
  notes: "Uses nmap host discovery and light gateway-port probing to model adjacent L3 reachability.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      cidr: { type: "string" },
      ports: { type: "string" }
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
  }
} as const;
