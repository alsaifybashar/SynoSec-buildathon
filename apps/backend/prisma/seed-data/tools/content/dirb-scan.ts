import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const dirbScanTool = {
  id: "seed-dirb-scan",
  name: "Dirb Scan",
  description: "Run Dirb-style directory guessing against a confirmed target URL with a compact built-in wordlist. Use for bounded content discovery when hidden paths are in scope. Provide `baseUrl` or `target`. Returns discovered path/status evidence; do not use for passive crawling or vulnerability validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/dirb-scan.sh");
  },
  capabilities: ["content-discovery", "passive"],
  binary: "dirb",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Dirb directory brute forcing.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
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
