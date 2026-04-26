import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringInputSchema } from "../shared/seeded-web-input-schema.js";

export const vulnAuditTool = {
  id: "seed-vuln-audit",
  name: "Vulnerability Audit",
  description: "Run targeted known-issue checks against a confirmed web target and summarize likely findings. Use after recon has produced candidate endpoints, parameters, or hypotheses. Provide `baseUrl` or `target`; optionally steer with validation targets or notes. Returns evidence-backed observations; do not use for initial discovery.",
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
  inputSchema: seededWebSteeringInputSchema,
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" }
    }
  }
} as const;
