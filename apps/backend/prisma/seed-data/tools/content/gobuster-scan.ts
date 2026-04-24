import { loadSeedToolScript } from "../load-script.js";

export const gobusterScanTool = {
  id: "seed-gobuster-scan",
  name: "Gobuster Scan",
  description: "Run Gobuster against a target URL with a compact built-in wordlist.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/gobuster-scan.sh");
  },
  capabilities: ["content-discovery", "passive"],
  binary: "gobuster",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Gobuster directory mode for seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
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
