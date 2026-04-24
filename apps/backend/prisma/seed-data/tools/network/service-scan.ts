import { loadSeedToolScript } from "../load-script.js";

export const serviceScanTool = {
  id: "seed-service-scan",
  name: "Service Scan",
  description: "Enumerate exposed ports and identify reachable network services.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/service-scan.sh");
  },
  capabilities: ["network-recon", "passive"],
  binary: "node",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Primary network discovery tool for orchestrator and pen-tester roles.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
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
      output: { type: "string" }
    }
  }
} as const;
