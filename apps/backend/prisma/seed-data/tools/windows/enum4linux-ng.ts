import { loadSeedToolScript } from "../load-script.js";

export const enum4linuxngTool = {
  id: "seed-enum4linux-ng",
  name: "Enum4linux-ng",
  description: "Next generation enum4linux.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/enum4linux-ng.sh");
  },
  capabilities: ["windows","enum"],
  binary: "enum4linux-ng",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Enum4linux-ng for seeded execution.",
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
