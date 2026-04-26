import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const paramSpiderTool = {
  id: "seed-paramspider",
  name: "ParamSpider",
  description: "Mine archived and known URLs for likely query parameters on an in-scope web target. Use before injection or XSS validation when candidate parameter names are needed. Provide `target`, domain, or `baseUrl`. Returns parameter observations; do not claim exploitability from parameter discovery alone.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/paramspider.sh");
  },
  capabilities: ["param-discovery","web"],
  binary: "paramspider",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for ParamSpider.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededWebSteeringProperties
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
