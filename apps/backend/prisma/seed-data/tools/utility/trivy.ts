import { loadSeedToolScript } from "../load-script.js";
import { seededContextSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const trivyTool = {
  id: "seed-trivy",
  name: "Trivy",
  description: "Scan container images, filesystems, IaC, or dependencies for known vulnerabilities, secrets, and misconfigurations. Use when artifact or repository context is in scope. Provide target artifact path or image context. Returns scanner observations; verify relevance before reporting runtime impact.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/trivy.sh");
  },
  capabilities: ["vuln-scan","containers"],
  binary: "trivy",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Trivy.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededContextSteeringProperties
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
