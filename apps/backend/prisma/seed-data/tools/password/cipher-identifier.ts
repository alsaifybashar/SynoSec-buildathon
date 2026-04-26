import { loadSeedToolScript } from "../load-script.js";

export const cipherIdentifierTool = {
  id: "seed-cipher-identifier",
  name: "Cipher-Identifier",
  description: "Identify ciphers.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/cipher-identifier.sh");
  },
  capabilities: ["crypto","identifier"],
  binary: "cipher-identifier",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Cipher-Identifier for seeded execution.",
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
