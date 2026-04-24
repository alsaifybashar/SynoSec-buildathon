import { loadSeedToolScript } from "../load-script.js";

export const kubebenchTool = {
  id: "seed-kube-bench",
  name: "Kube-bench",
  description: "Checks whether Kubernetes is deployed securely.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/kube-bench.sh");
  },
  capabilities: ["k8s","security-audit"],
  binary: "kube-bench",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Kube-bench for seeded execution.",
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
