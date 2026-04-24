import { loadSeedToolScript } from "../load-script.js";

export const waybackurlsTool = {
  id: "seed-waybackurls",
  name: "Waybackurls",
  description: "Accept domains and fetch known URLs from the Wayback Machine.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/waybackurls.sh");
  },
  capabilities: ["content-discovery","web"],
  binary: "waybackurls",
  category: "web" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Waybackurls for seeded execution.",
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
