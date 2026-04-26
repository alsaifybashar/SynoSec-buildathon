import { loadSeedToolScript } from "../load-script.js";
import { seededContextSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const responderTool = {
  id: "seed-responder",
  name: "Responder",
  description: "Validate LLMNR, NBT-NS, or mDNS poisoning exposure inside an authorized controlled network. Use only when credential-capture risk must be proven and active poisoning is in scope. Provide target or network context. Returns poisoning/capture evidence or failure context; do not use for passive Windows enumeration.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/responder.sh");
  },
  capabilities: ["windows","network","poisoning"],
  binary: "responder",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Responder.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededContextSteeringProperties
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
