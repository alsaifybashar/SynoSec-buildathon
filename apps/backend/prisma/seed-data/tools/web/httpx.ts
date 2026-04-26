import { loadSeedToolScript } from "../load-script.js";
import { seededPassiveHttpSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const hTTPxTool = {
  id: "seed-httpx",
  name: "HTTPx",
  description: "Run fast HTTP probing against known hosts or URLs to collect status, title, technology hints, redirects, and response metadata. Use for broad but bounded HTTP surface assessment after targets are in scope. Provide `target`, `baseUrl`, or candidate endpoints. Returns HTTP observations; do not use for path brute forcing or exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/httpx.sh");
  },
  capabilities: ["recon","web"],
  binary: "httpx",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for HTTPx.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededPassiveHttpSteeringProperties
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
