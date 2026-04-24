import { loadSeedToolScript } from "../load-script.js";

export const bashProbeTool = {
  id: "seed-bash-probe",
  name: "Bash Probe",
  description: "Run a deterministic local bash probe that confirms input wiring and structured JSON output.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/bash-probe.sh");
  },
  capabilities: ["passive"],
  binary: "bash",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Useful for smoke tests and demo verification of the bash tool path.",
  sandboxProfile: "read-only-parser" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 10000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: ["baseUrl"]
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
