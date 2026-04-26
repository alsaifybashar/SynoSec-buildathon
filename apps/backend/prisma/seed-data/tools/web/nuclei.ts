import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const nucleiTool = {
  id: "seed-nuclei",
  name: "Nuclei",
  description: "Run template-based checks against a known in-scope target to validate common exposures and known signatures. Use after reconnaissance identifies a concrete HTTP surface. Provide `baseUrl`, `target`, or candidate endpoints. Returns matched-template evidence and observations; review severity and evidence before reporting.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/nuclei.sh");
  },
  capabilities: ["vuln-scan","web"],
  binary: "nuclei",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Nuclei.",
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
