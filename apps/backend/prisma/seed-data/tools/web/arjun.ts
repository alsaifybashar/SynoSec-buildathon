import { loadSeedToolScript } from "../load-script.js";

export const arjunTool = {
  id: "seed-arjun",
  name: "Arjun",
  description: "HTTP parameter discovery suite.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/arjun.sh");
  },
  capabilities: ["param-discovery","web"],
  binary: "arjun",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Arjun for seeded execution.",
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
