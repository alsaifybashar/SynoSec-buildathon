import type { ToolCatalogEntry } from "./types.js";

export const contentTools: ToolCatalogEntry[] = [
  { id: "dirb", displayName: "Dirb", binary: "dirb", category: "content", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["content", "directory", "bruteforce"] },
  { id: "dirsearch", displayName: "Dirsearch", binary: "dirsearch", category: "content", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["content", "directory", "fuzzing"] },
  { id: "feroxbuster", displayName: "Feroxbuster", binary: "feroxbuster", category: "content", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["content", "directory", "recursive"] },
  { id: "ffuf", displayName: "FFuf", binary: "ffuf", category: "content", riskTier: "passive", notes: "Implemented via content_discovery.", phase: "enum", osiLayers: ["L7"], tags: ["content", "fuzzing", "wordlist"] },
  { id: "gau", displayName: "Gau", binary: "gau", category: "content", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["content", "archive", "urls"] },
  { id: "gobuster", displayName: "Gobuster", binary: "gobuster", category: "content", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["content", "directory", "dns"] },
  { id: "hakrawler", displayName: "Hakrawler", binary: "hakrawler", category: "content", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["content", "crawl", "urls"] },
  { id: "katana", displayName: "Katana", binary: "katana", category: "content", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["content", "crawl", "spider"] },
  { id: "waybackurls", displayName: "Waybackurls", binary: "waybackurls", category: "content", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["content", "archive", "urls"] }
];
