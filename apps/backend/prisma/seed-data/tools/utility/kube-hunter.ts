import { loadSeedToolScript } from "../load-script.js";
import { seededContextSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const kubehunterTool = {
  id: "seed-kube-hunter",
  name: "Kube-hunter",
  description: "Assess a Kubernetes cluster for exposed services, risky configuration, and common security weaknesses. Use only when cluster probing is authorized. Provide target or cluster context. Returns Kubernetes exposure observations; do not use for generic host scanning.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/kube-hunter.sh");
  },
  capabilities: ["k8s","vuln-scan"],
  binary: "kube-hunter",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Kube-hunter.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededContextSteeringProperties
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
