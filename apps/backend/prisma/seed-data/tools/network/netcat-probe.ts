import { loadSeedToolScript } from "../load-script.js";

export const netcatProbeTool = {
  id: "seed-netcat-probe",
  name: "Netcat Probe",
  description: "Probe a TCP service with netcat and capture any banner or response bytes.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/network/netcat-probe.sh");
  },
  capabilities: ["network-recon", "passive", "banner-grab"],
  binary: "nc",
  category: "network" as const,
  riskTier: "passive" as const,
  notes: "Useful for lightweight TCP validation when netcat is installed.",
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
