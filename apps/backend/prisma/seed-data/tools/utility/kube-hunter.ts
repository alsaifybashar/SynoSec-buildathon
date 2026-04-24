import { loadSeedToolScript } from "../load-script.js";

export const kubehunterTool = {
  id: "seed-kube-hunter",
  name: "Kube-hunter",
  description: "Hunts for security weaknesses in Kubernetes clusters.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/kube-hunter.sh");
  },
  capabilities: ["k8s","vuln-scan"],
  binary: "kube-hunter",
  category: "utility" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Kube-hunter for seeded execution.",
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
