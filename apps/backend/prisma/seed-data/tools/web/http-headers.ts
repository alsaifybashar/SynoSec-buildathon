import { loadSeedToolScript } from "../load-script.js";

export const httpHeadersTool = {
  id: "seed-http-headers",
  name: "HTTP Headers",
  description: "Fetch final HTTP response headers for a target URL using curl.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/http-headers.sh");
  },
  capabilities: ["web-recon", "passive"],
  binary: "curl",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Fast header collection tool that works well in demo environments.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 30000,
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
