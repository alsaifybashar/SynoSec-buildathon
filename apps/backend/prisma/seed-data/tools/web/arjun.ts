import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const arjunTool = {
  id: "seed-arjun",
  name: "Arjun",
  description: "Discover likely HTTP query or body parameters on supplied endpoints. Use after a candidate URL is known and before targeted validation. Provide `baseUrl`, `url`, or candidate endpoints. Returns parameter evidence and observations; do not use as vulnerability proof by itself.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/arjun.sh");
  },
  capabilities: ["param-discovery","web"],
  binary: "arjun",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Arjun.",
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
