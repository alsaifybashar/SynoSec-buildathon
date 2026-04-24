import type { ToolCatalogEntry } from "./types.js";

export const cloudTools: ToolCatalogEntry[] = [
  { id: "prowler", displayName: "Prowler", binary: "prowler", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "aws", "audit"] },
  { id: "scout-suite", displayName: "Scout Suite", binary: "scout", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "audit", "multi-cloud"] },
  { id: "trivy", displayName: "Trivy", binary: "trivy", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L6", "L7"], tags: ["cloud", "container", "misconfig"] }
];
