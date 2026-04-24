import { loadSeedToolScript } from "../load-script.js";

export const trivyTool = {
  id: "seed-trivy",
  name: "Trivy",
  description: "Comprehensive security scanner.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/trivy.sh");
  },
  capabilities: ["vuln-scan","containers"],
  binary: "trivy",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Trivy for seeded execution.",
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
