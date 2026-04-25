import type { ToolCatalogEntry } from "./types.js";

export const cloudTools: ToolCatalogEntry[] = [
  { id: "prowler", displayName: "Prowler", binary: "prowler", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "aws", "audit"] },
  { id: "scout-suite", displayName: "Scout Suite", binary: "scout", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "audit", "multi-cloud"] },
  { id: "trivy", displayName: "Trivy", binary: "trivy", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L6", "L7"], tags: ["cloud", "container", "misconfig"] },
  { id: "cloudfail", displayName: "CloudFail", binary: "cloudfail", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["cloud", "cloudflare", "bypass", "osint"] },
  { id: "pacu", displayName: "Pacu", binary: "pacu", category: "cloud", riskTier: "active", phase: "exploit", osiLayers: ["L7"], tags: ["cloud", "aws", "exploit", "iam"] },
  { id: "cloudsploit", displayName: "CloudSploit", binary: "cloudsploit", category: "cloud", riskTier: "passive", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "audit", "misconfig", "multi-cloud"] },
  { id: "aws-inspector", displayName: "AWS Inspector", binary: null, category: "cloud", riskTier: "passive", notes: "AWS managed service; access via AWS console or CLI.", phase: "vuln-scan", osiLayers: ["L7"], tags: ["cloud", "aws", "vuln-scan", "managed"] },
  { id: "aws-config", displayName: "AWS Config", binary: null, category: "cloud", riskTier: "passive", notes: "AWS managed service; access via AWS console or CLI.", phase: "utility", osiLayers: ["L7"], tags: ["cloud", "aws", "compliance", "config"] },
  { id: "cloudmapper", displayName: "CloudMapper", binary: "cloudmapper", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "aws", "visualization", "network-map"] },
  { id: "cloud-custodian", displayName: "Cloud Custodian", binary: "custodian", category: "cloud", riskTier: "passive", phase: "utility", osiLayers: ["L7"], tags: ["cloud", "policy", "compliance", "multi-cloud"] },
  { id: "ice", displayName: "ICE", binary: "ice", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "aws", "iam", "cross-account"] },
  { id: "aws-naa", displayName: "AWS Network Access Analyzer", binary: null, category: "cloud", riskTier: "passive", notes: "AWS managed service; access via AWS console or CLI.", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["cloud", "aws", "network", "access-analysis"] },
  { id: "cloudtracker", displayName: "CloudTracker", binary: "cloudtracker", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "aws", "cloudtrail", "iam"] },
  { id: "weirdaal", displayName: "WeirdAAL", binary: "weirdaal", category: "cloud", riskTier: "active", phase: "exploit", osiLayers: ["L7"], tags: ["cloud", "aws", "attack", "iam"] },
  { id: "gitoops", displayName: "GitOops", binary: "gitoops", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "github", "ci-cd", "supply-chain"] },
  { id: "cloudbrute", displayName: "CloudBrute", binary: "cloudbrute", category: "cloud", riskTier: "active", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "bruteforce", "storage", "multi-cloud"] },
  { id: "gcpbucketbrute", displayName: "GCPBucketBrute", binary: "GCPBucketBrute", category: "cloud", riskTier: "active", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "gcp", "storage", "bruteforce"] },
  { id: "microburst", displayName: "MicroBurst", binary: null, category: "cloud", riskTier: "active", notes: "PowerShell Azure attack toolkit; run via Import-Module.", phase: "exploit", osiLayers: ["L7"], tags: ["cloud", "azure", "attack", "powershell"] },
  { id: "stormspotter", displayName: "Stormspotter", binary: "stormspotter", category: "cloud", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["cloud", "azure", "graph", "attack-path"] }
];
