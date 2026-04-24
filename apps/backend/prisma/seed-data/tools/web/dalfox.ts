import { loadSeedToolScript } from "../load-script.js";

export const dalfoxTool = {
  id: "seed-dalfox",
  name: "Dalfox",
  description: "Parameter Analysis and XSS Scanning tool.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/dalfox.sh");
  },
  capabilities: ["xss","vuln-scan"],
  binary: "dalfox",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Dalfox for seeded execution.",
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
