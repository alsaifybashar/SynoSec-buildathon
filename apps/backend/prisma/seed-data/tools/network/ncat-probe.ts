import { loadSeedToolScript } from "../load-script.js";
import { seededPortSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const ncatProbeTool = {
  id: "seed-ncat-probe",
  name: "Ncat Probe",
  description: "Probe a known TCP service with ncat and capture returned banners or response bytes. Use when a single service needs lightweight confirmation or protocol hints. Provide `target` and `port`. Returns banner observations; do not use for broad scanning or exploitation.",
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
    properties: seededPortSteeringProperties,
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
