import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const dirsearchTool = {
  id: "seed-dirsearch",
  name: "Dirsearch",
  description: "Enumerate likely web paths and directories on a confirmed target using bounded path guessing. Use when content discovery is authorized and candidate hidden routes matter. Provide `baseUrl` or `target`. Returns path/status observations; do not use for passive crawling or exploit validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/dirsearch.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "dirsearch",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Dirsearch.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededWebSteeringProperties
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
