import { loadSeedToolScript } from "../load-script.js";

export const johntheRipperTool = {
  id: "seed-john-the-ripper",
  name: "John the Ripper",
  description: "Run an offline John the Ripper cracking attempt against supplied hash material. Use for lab-scoped password recovery after hash capture and format identification. Provide `hash`, `hashes`, or file context. Returns cracking output and observations; do not use for online login attempts.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/john-the-ripper.sh");
  },
  capabilities: ["password-cracking","brute-force"],
  binary: "john",
  category: "password" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for John the Ripper.",
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
