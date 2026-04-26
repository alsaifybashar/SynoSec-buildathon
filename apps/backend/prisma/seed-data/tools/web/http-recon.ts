import { loadSeedToolScript } from "../load-script.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const httpReconTool = {
  id: "seed-http-recon",
  name: "HTTP Recon",
  description: "Probe a known HTTP or HTTPS target for reachability, redirects, status code, headers, title, cookies, and lightweight fingerprint signals. Use for initial web reconnaissance before crawling or validation. Provide `baseUrl`, `url`, or `target`. Returns response evidence and observations; do not use for hidden path discovery or exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/http-recon.sh");
  },
  capabilities: ["web-recon", "passive"],
  binary: "httpx",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Starter reconnaissance tool for orchestrator, QA, and pen-test flows.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 120000,
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
