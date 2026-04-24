import { loadSeedToolScript } from "../load-script.js";

export const dirsearchTool = {
  id: "seed-dirsearch",
  name: "Dirsearch",
  description: "Web path scanner.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/dirsearch.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "dirsearch",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Dirsearch for seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    }
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
