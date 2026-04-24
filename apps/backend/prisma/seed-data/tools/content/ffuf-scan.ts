import { loadSeedToolScript } from "../load-script.js";

export const ffufScanTool = {
  id: "seed-ffuf-scan",
  name: "FFuf Scan",
  description: "Run FFuf against a target URL with a compact built-in wordlist.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/ffuf-scan.sh");
  },
  capabilities: ["content-discovery", "passive", "fuzzing"],
  binary: "ffuf",
  category: "content" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around FFuf for seeded content fuzzing.",
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
