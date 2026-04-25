import type { ToolCatalogEntry } from "./types.js";

export const cloudTools: ToolCatalogEntry[] = [
  { id: "prowler", displayName: "Prowler", binary: "prowler", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "aws", "audit"] },
  { id: "scout-suite", displayName: "Scout Suite", binary: "scout", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "audit", "multi-cloud"] },
  { id: "trivy", displayName: "Trivy", binary: "trivy", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L6", "L7"], tags: ["cloud", "container", "misconfig"] },
  { id: "cloudfail", displayName: "CloudFail", binary: "cloudfail", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["cloud", "cloudflare", "bypass", "osint"] }
];
