import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const feroxbusterTool = {
  id: "seed-feroxbuster",
  name: "Feroxbuster",
  description: "Run fast recursive content discovery against a confirmed web target. Use when hidden paths, directories, or nested resources are in scope and bounded enumeration is acceptable. Provide `baseUrl` or `target`. Returns discovered path observations; do not use for vulnerability confirmation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/feroxbuster.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "feroxbuster",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Feroxbuster.",
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
