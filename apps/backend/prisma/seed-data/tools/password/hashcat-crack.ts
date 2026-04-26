import { loadSeedToolScript } from "../load-script.js";

export const hashcatCrackTool = {
  id: "seed-hashcat-crack",
  name: "Hashcat Crack",
  description: "Run an offline Hashcat attempt against supplied hash material with a compact built-in wordlist. Use only inside the authorized lab boundary after hash format is known or hypothesized. Provide `hash` or `hashes` and optional `hashType` or mode. Returns cracking attempt evidence; it does not contact target services.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/password/hashcat-crack.sh");
  },
  capabilities: ["password-cracking", "controlled-exploit"],
  binary: "hashcat",
  category: "password" as const,
  riskTier: "controlled-exploit" as const,
  notes: "Raw adapter for Hashcat offline cracking checks.",
  sandboxProfile: "controlled-exploit-lab" as const,
  privilegeProfile: "controlled-exploit" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      hash: { type: "string" },
      hashes: {
        type: "array",
        items: { type: "string" }
      },
      hashType: { type: "string" },
      mode: { type: "number" }
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
