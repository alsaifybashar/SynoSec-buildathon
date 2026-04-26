import { loadSeedToolScript } from "../load-script.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const httpHeadersTool = {
  id: "seed-http-headers",
  name: "HTTP Headers",
  description: "Fetch final HTTP response headers for a known URL. Use when you need exact header evidence such as HSTS, CSP, X-Frame-Options, cookies, redirects, or server metadata. Provide `baseUrl` or `url`. Returns raw headers and observations; do not use for crawling, content discovery, or vulnerability proof beyond header-backed findings.",
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
    properties: seededPassiveHttpSteeringProperties,
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
