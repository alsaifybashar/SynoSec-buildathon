import type { ToolCatalogEntry } from "./types.js";

export const webTools: ToolCatalogEntry[] = [
  { id: "arjun", displayName: "Arjun", binary: "arjun", category: "web", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["web", "parameters", "discovery"] },
  { id: "burp-suite", displayName: "Burp Suite", binary: null, category: "web", riskTier: "active", notes: "Manual integration required.", phase: "enum", osiLayers: ["L7"], tags: ["web", "proxy", "manual"] },
  { id: "dalfox", displayName: "Dalfox", binary: "dalfox", category: "web", riskTier: "active", phase: "vuln-scan", osiLayers: ["L7"], tags: ["web", "xss", "fuzzing"] },
  { id: "httpx", displayName: "HTTPx", binary: "httpx", category: "web", riskTier: "passive", phase: "recon", osiLayers: ["L5", "L6", "L7"], tags: ["web", "http", "probe"] },
  { id: "nikto", displayName: "Nikto", binary: "nikto", category: "web", riskTier: "active", notes: "Implemented via nikto_scan.", phase: "vuln-scan", osiLayers: ["L7"], tags: ["web", "misconfig", "vuln-scan"] },
  { id: "nuclei", displayName: "Nuclei", binary: "nuclei", category: "web", riskTier: "active", notes: "Implemented via nuclei_scan.", phase: "vuln-scan", osiLayers: ["L7"], tags: ["web", "templates", "vuln-scan"] },
  { id: "paramspider", displayName: "ParamSpider", binary: "paramspider", category: "web", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["web", "parameters", "archive"] },
  { id: "sqlmap", displayName: "SQLMap", binary: "sqlmap", category: "web", riskTier: "controlled-exploit", notes: "Implemented via db_injection_check.", phase: "exploit", osiLayers: ["L7"], tags: ["web", "sqli", "database"] },
  { id: "whatweb", displayName: "WhatWeb", binary: "whatweb", category: "web", riskTier: "passive", notes: "Implemented via web_fingerprint.", phase: "recon", osiLayers: ["L7"], tags: ["web", "fingerprint", "tech-stack"] },
  { id: "git-dumper", displayName: "git-dumper", binary: "git-dumper", category: "web", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["web", "git", "source-code"] },
  { id: "eyewitness", displayName: "EyeWitness", binary: "EyeWitness", category: "web", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["web", "screenshot", "fingerprint"] },
  { id: "wappalyzer", displayName: "Wappalyzer", binary: "wappalyzer", category: "web", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["web", "fingerprint", "tech-stack"] },
  { id: "snallygaster", displayName: "snallygaster", binary: "snallygaster", category: "web", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["web", "secrets", "exposed-files"] },
  { id: "parsero", displayName: "Parsero", binary: "parsero", category: "web", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["web", "robots.txt", "osint"] }
];
