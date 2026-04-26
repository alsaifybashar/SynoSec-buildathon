import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const sqlmapScanTool = {
  id: "seed-sqlmap-scan",
  name: "SQLMap Scan",
  description: "Run sqlmap-style SQL injection validation against a specific approved target URL or parameter set. Use only for controlled exploit validation after a concrete hypothesis exists. Provide `url`, `baseUrl`, candidate parameters, or validation targets. Returns sqlmap output and observations; do not use for generic discovery.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/sqlmap-scan.sh");
  },
  capabilities: ["database-security", "controlled-exploit", "sqli"],
  binary: "sqlmap",
  category: "web" as const,
  riskTier: "controlled-exploit" as const,
  notes: "Raw adapter for direct sqlmap execution.",
  sandboxProfile: "controlled-exploit-lab" as const,
  privilegeProfile: "controlled-exploit" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededWebSteeringProperties,
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
