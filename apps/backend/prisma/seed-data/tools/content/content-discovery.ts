import { loadSeedToolScript } from "../load-script.js";

export const contentDiscoveryTool = {
  id: "seed-content-discovery",
  name: "Content Discovery",
  description: "Brute-force common content paths to expand the application attack surface.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/content-discovery.sh");
  },
  capabilities: ["content-discovery", "active-recon"],
  binary: "node",
  category: "content" as const,
  riskTier: "active" as const,
  notes: "Assigned to orchestrator and pen-tester roles for path discovery.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
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
      output: { type: "string" }
    }
  }
} as const;
