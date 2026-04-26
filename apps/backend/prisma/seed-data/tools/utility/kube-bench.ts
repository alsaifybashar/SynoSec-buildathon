import { loadSeedToolScript } from "../load-script.js";
import { seededContextSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const kubebenchTool = {
  id: "seed-kube-bench",
  name: "Kube-bench",
  description: "Check Kubernetes configuration against benchmark-style controls. Use when cluster context or configuration artifacts are in scope. Provide cluster or file context and notes. Returns Kubernetes hardening observations; do not use for workload exploitation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/kube-bench.sh");
  },
  capabilities: ["k8s","security-audit"],
  binary: "kube-bench",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Kube-bench.",
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
