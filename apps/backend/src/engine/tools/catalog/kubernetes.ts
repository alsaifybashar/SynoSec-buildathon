import type { ToolCatalogEntry } from "./types.js";

export const kubernetesTools: ToolCatalogEntry[] = [
  { id: "kube-bench", displayName: "Kube-bench", binary: "kube-bench", category: "kubernetes", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["kubernetes", "benchmark", "cis"] },
  { id: "kube-hunter", displayName: "Kube-hunter", binary: "kube-hunter", category: "kubernetes", riskTier: "active", phase: "vuln-scan", osiLayers: ["L7"], tags: ["kubernetes", "vuln-scan", "cluster"] }
];
