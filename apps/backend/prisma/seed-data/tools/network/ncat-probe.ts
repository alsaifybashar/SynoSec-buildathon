import { loadSeedToolScript } from "../load-script.js";

export const ncatProbeTool = {
  id: "seed-ncat-probe",
  name: "Ncat Probe",
  description: "Probe a TCP service with ncat and capture any returned banner or response bytes.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/ncat-probe.sh");
  },
  capabilities: ["network-recon", "passive", "banner-grab"],
  binary: "ncat",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Useful for lightweight TCP validation and banner collection when ncat is installed.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      port: { type: "number" },
      baseUrl: { type: "string" }
    },
    required: ["target"]
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
