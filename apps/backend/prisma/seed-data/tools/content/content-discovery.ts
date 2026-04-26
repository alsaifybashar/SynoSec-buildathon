import { loadSeedToolScript } from "../load-script.js";
import { seededWebSteeringInputSchema } from "../shared/seeded-web-input-schema.js";

export const contentDiscoveryTool = {
  id: "seed-content-discovery",
  name: "Content Discovery",
  description: "Enumerate common content paths on a confirmed web target to expand the application attack surface. Use when bounded path guessing is authorized and hidden routes matter. Provide `target` and `baseUrl`; optionally steer with candidate paths or limits. Returns path/status observations; do not use for passive crawling or vulnerability confirmation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/content/content-discovery.sh");
  },
  capabilities: ["content-discovery", "active-recon"],
  binary: "node",
  category: "content" as const,
  riskTier: "active" as const,
  notes: "Assigned to orchestrator and pen-tester roles for path discovery.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 30000,
  inputSchema: seededWebSteeringInputSchema,
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" }
    }
  }
} as const;
