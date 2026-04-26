import { loadSeedToolScript } from "../load-script.js";

export const hashIdentifierTool = {
  id: "seed-hash-identifier",
  name: "Hash-Identifier",
  description: "Identify likely hash formats from supplied hash material before choosing a cracking or validation method. Provide `hash` or `hashes`. Returns format hypotheses and confidence signals; it does not crack or verify passwords.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/hash-identifier.sh");
  },
  capabilities: ["hash-id","password"],
  binary: "hash-identifier",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Hash-Identifier.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      hash: { type: "string" },
      hashes: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["hash"]
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
