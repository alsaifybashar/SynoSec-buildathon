import { loadSeedToolScript } from "../load-script.js";

export const burpSuiteTool = {
  id: "seed-burp-suite",
  name: "Burp Suite",
  description: "Integrated platform for performing security testing of web applications.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/burp-suite.sh");
  },
  capabilities: ["proxy","vuln-scan","web"],
  binary: "burp",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Burp Suite for seeded execution.",
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
