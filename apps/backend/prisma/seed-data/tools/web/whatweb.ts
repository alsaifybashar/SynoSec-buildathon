import { loadSeedToolScript } from "../load-script.js";

export const whatWebTool = {
  id: "seed-whatweb",
  name: "WhatWeb",
  description: "Identifies websites. Its goal is to answer the question, 'What is that Website?'.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/whatweb.sh");
  },
  capabilities: ["recon","fingerprinting"],
  binary: "whatweb",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around WhatWeb for seeded execution.",
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
