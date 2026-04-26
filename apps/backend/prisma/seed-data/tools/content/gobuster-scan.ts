import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const gobusterScanTool = {
  id: "seed-gobuster-scan",
  name: "Gobuster Scan",
  description: "Run Gobuster-style directory enumeration against a confirmed target URL with a compact built-in wordlist. Use for bounded hidden-content discovery when in scope. Provide `baseUrl` or `target`. Returns discovered path observations; do not use for passive crawling or vulnerability proof.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/gobuster-scan.sh");
  },
  capabilities: ["content-discovery", "passive"],
  binary: "gobuster",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Gobuster directory mode.",
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
