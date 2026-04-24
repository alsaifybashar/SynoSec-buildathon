import { loadSeedToolScript } from "../load-script.js";

export const nucleiTool = {
  id: "seed-nuclei",
  name: "Nuclei",
  description: "Fast and customizable vulnerability scanner based on simple YAML based templates.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/nuclei.sh");
  },
  capabilities: ["vuln-scan","web"],
  binary: "nuclei",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Nuclei for seeded execution.",
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
