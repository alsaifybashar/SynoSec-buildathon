import { loadSeedToolScript } from "../load-script.js";

export const katanaTool = {
  id: "seed-katana",
  name: "Katana",
  description: "Next-generation crawling and spidering framework.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/katana.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "katana",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Katana for seeded execution.",
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
