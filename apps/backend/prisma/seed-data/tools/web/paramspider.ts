import { loadSeedToolScript } from "../load-script.js";

export const paramSpiderTool = {
  id: "seed-paramspider",
  name: "ParamSpider",
  description: "Mining parameters from dark corners of Web Archive.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/paramspider.sh");
  },
  capabilities: ["param-discovery","web"],
  binary: "paramspider",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around ParamSpider for seeded execution.",
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
