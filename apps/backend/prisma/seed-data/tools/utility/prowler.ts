import { loadSeedToolScript } from "../load-script.js";

export const prowlerTool = {
  id: "seed-prowler",
  name: "Prowler",
  description: "Open Source security tool to perform AWS security best practices assessments, audits, incident response, continuous monitoring, hardening and forensics readiness.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/prowler.sh");
  },
  capabilities: ["cloud","aws","security-audit"],
  binary: "prowler",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Prowler for seeded execution.",
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
