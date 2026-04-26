import { loadSeedToolScript } from "../load-script.js";

export const stringsTool = {
  id: "seed-strings",
  name: "Strings",
  description: "Extract printable strings from a local file or binary artifact. Use during static triage to find URLs, secrets, symbols, paths, or suspicious markers. Provide `filePath`. Returns string observations; it does not validate whether discovered strings are exploitable.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/strings.sh");
  },
  capabilities: ["analysis","utility"],
  binary: "strings",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Strings.",
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
