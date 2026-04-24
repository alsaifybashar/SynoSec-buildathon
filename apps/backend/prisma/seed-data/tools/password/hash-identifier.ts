import { loadSeedToolScript } from "../load-script.js";

export const hashIdentifierTool = {
  id: "seed-hash-identifier",
  name: "Hash-Identifier",
  description: "Identify the different types of hashes used to encrypt data.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/hash-identifier.sh");
  },
  capabilities: ["hash-id","password"],
  binary: "hash-identifier",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Hash-Identifier for seeded execution.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    }
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
