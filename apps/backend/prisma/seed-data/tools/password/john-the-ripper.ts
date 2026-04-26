import { loadSeedToolScript } from "../load-script.js";

export const johntheRipperTool = {
  id: "seed-john-the-ripper",
  name: "John the Ripper",
  description: "Fast password cracker.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/john-the-ripper.sh");
  },
  capabilities: ["password-cracking","brute-force"],
  binary: "john",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around John the Ripper for seeded execution.",
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
      },
      hashType: { type: "string" }
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
