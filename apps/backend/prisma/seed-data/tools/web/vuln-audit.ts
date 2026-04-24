import { loadSeedToolScript } from "../load-script.js";

export const vulnAuditTool = {
  id: "seed-vuln-audit",
  name: "Vulnerability Audit",
  description: "Run known issue checks against a target and summarize likely findings.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/vuln-audit.sh");
  },
  capabilities: ["vulnerability-audit", "active-recon"],
  binary: "node",
  category: "web" as const,
  riskTier: "active" as const,
  notes: "Shared between QA and pen-test roles for controlled active validation.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 45000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: ["target", "baseUrl"]
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" }
    }
  }
} as const;
