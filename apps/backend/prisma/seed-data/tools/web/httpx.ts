import { loadSeedToolScript } from "../load-script.js";

export const hTTPxTool = {
  id: "seed-httpx",
  name: "HTTPx",
  description: "Fast and multi-purpose HTTP toolkit.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/httpx.sh");
  },
  capabilities: ["recon","web"],
  binary: "httpx",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around HTTPx for seeded execution.",
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
