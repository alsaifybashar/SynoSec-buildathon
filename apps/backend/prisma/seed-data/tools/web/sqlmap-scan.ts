import { loadSeedToolScript } from "../load-script.js";

export const sqlmapScanTool = {
  id: "seed-sqlmap-scan",
  name: "SQLMap Scan",
  description: "Run sqlmap against a target URL for controlled SQL injection validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/sqlmap-scan.sh");
  },
  capabilities: ["database-security", "controlled-exploit", "sqli"],
  binary: "sqlmap",
  category: "web" as const,
  riskTier: "controlled-exploit" as const,
  notes: "Wrapper around sqlmap for direct seeded execution.",
  sandboxProfile: "controlled-exploit-lab" as const,
  privilegeProfile: "controlled-exploit" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: ["baseUrl"]
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
