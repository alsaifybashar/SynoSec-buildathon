import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const ffufScanTool = {
  id: "seed-ffuf-scan",
  name: "FFuf Scan",
  description: "Run FFuf-style fuzzing against a confirmed target URL with a compact built-in wordlist. Use for bounded path or route discovery when content enumeration is authorized. Provide `baseUrl` or `target`; optionally include candidate paths or limits. Returns path/status observations; do not use for exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/ffuf-scan.sh");
  },
  capabilities: ["content-discovery", "passive", "fuzzing"],
  binary: "ffuf",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for FFuf content fuzzing.",
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
