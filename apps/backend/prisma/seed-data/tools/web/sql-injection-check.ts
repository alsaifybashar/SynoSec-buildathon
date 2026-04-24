import { loadSeedToolScript } from "../load-script.js";

export const sqlInjectionCheckTool = {
  id: "seed-sql-injection-check",
  name: "SQL Injection Check",
  description: "Perform controlled database injection validation against approved targets.",
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
