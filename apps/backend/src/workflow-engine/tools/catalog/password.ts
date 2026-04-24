import type { ToolCatalogEntry } from "./types.js";

export const passwordTools: ToolCatalogEntry[] = [
  { id: "hashcat", displayName: "Hashcat", binary: "hashcat", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "gpu"] },
  { id: "hash-identifier", displayName: "Hash-Identifier", binary: "hash-identifier", category: "password", riskTier: "passive", phase: "utility", osiLayers: ["L7"], tags: ["password", "hash", "identify"] },
  { id: "hydra", displayName: "Hydra", binary: "hydra", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L7"], tags: ["password", "bruteforce", "credentials"] },
  { id: "john", displayName: "John the Ripper", binary: "john", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "offline"] },
  { id: "medusa", displayName: "Medusa", binary: "medusa", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L7"], tags: ["password", "bruteforce", "credentials"] },
  { id: "ophcrack", displayName: "Ophcrack", binary: "ophcrack", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "windows"] },
  { id: "patator", displayName: "Patator", binary: "patator", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L7"], tags: ["password", "bruteforce", "multi-protocol"] }
];
