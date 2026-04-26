import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const sqlInjectionCheckTool = {
  id: "seed-sql-injection-check",
  name: "SQL Injection Check",
  description: "Perform controlled SQL injection validation against approved candidate endpoints or parameters. Use only when a specific URL, parameter, or validation target is in scope. Provide `baseUrl`, `url`, candidate parameters, or validation targets. Returns payload/response evidence; do not use for broad crawling or unscoped exploitation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/sql-injection-check.sh");
  },
  capabilities: ["database-security", "controlled-exploit"],
  binary: "node",
  category: "web" as const,
  riskTier: "controlled-exploit" as const,
  notes: "Restricted pen-test tool for controlled exploit validation.",
  sandboxProfile: "controlled-exploit-lab" as const,
  privilegeProfile: "controlled-exploit" as const,
  timeoutMs: 45000,
  inputSchema: {
    type: "object",
    properties: seededWebSteeringProperties,
    required: ["target", "baseUrl"]
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" }
    }
  }
} as const;
