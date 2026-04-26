import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const enum4linuxngTool = {
  id: "seed-enum4linux-ng",
  name: "Enum4linux-ng",
  description: "Enumerate SMB, domain, share, user, and Windows host signals with enum4linux-ng. Use for deeper Windows/SMB reconnaissance after service discovery. Provide `target` and optional notes. Returns enumeration observations; do not use for remote access validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/enum4linux-ng.sh");
  },
  capabilities: ["windows","enum"],
  binary: "enum4linux-ng",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Enum4linux-ng.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededCredentialSteeringProperties
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
