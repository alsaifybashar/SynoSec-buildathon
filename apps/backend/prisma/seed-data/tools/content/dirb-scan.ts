import { loadSeedToolScript } from "../load-script.js";

export const dirbScanTool = {
  id: "seed-dirb-scan",
  name: "Dirb Scan",
  description: "Run Dirb against a target URL with a compact built-in wordlist.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/dirb-scan.sh");
  },
  capabilities: ["content-discovery", "passive"],
  binary: "dirb",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Dirb for seeded directory brute forcing.",
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
