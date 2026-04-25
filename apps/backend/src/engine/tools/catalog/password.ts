import type { ToolCatalogEntry } from "./types.js";

export const passwordTools: ToolCatalogEntry[] = [
  { id: "hashcat", displayName: "Hashcat", binary: "hashcat", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "gpu"] },
  { id: "hash-identifier", displayName: "Hash-Identifier", binary: "hash-identifier", category: "password", riskTier: "passive", phase: "utility", osiLayers: ["L7"], tags: ["password", "hash", "identify"] },
  { id: "hydra", displayName: "Hydra", binary: "hydra", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L7"], tags: ["password", "bruteforce", "credentials"] },
  { id: "john", displayName: "John the Ripper", binary: "john", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "offline"] },
  { id: "medusa", displayName: "Medusa", binary: "medusa", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L7"], tags: ["password", "bruteforce", "credentials"] },
  { id: "ophcrack", displayName: "Ophcrack", binary: "ophcrack", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "windows"] },
  { id: "patator", displayName: "Patator", binary: "patator", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L7"], tags: ["password", "bruteforce", "multi-protocol"] },
  { id: "cain-abel", displayName: "Cain & Abel", binary: null, category: "password", riskTier: "controlled-exploit", notes: "Windows-only GUI; credential recovery, ARP spoofing, and hash cracking.", phase: "post", osiLayers: ["L2", "L4", "L7"], tags: ["password", "cracking", "windows", "arp-spoof"] },
  { id: "l0phtcrack", displayName: "L0phtCrack", binary: null, category: "password", riskTier: "controlled-exploit", notes: "Commercial Windows password auditing tool; requires license.", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "windows", "commercial"] },
  { id: "crackstation", displayName: "CrackStation", binary: null, category: "password", riskTier: "passive", notes: "Online hash lookup service; web browser access required.", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "online", "lookup"] },
  { id: "aircrack-ng", displayName: "Aircrack-ng", binary: "aircrack-ng", category: "password", riskTier: "active", phase: "exploit", osiLayers: ["L1", "L2"], tags: ["password", "wifi", "wpa", "wep", "cracking"] },
  { id: "pipal", displayName: "pipal", binary: "pipal", category: "password", riskTier: "passive", phase: "utility", osiLayers: ["L7"], tags: ["password", "analysis", "statistics"] },
  { id: "mentalist", displayName: "Mentalist", binary: "mentalist", category: "password", riskTier: "passive", phase: "utility", osiLayers: ["L7"], tags: ["password", "wordlist", "generator"] },
  { id: "ophcrack-cli", displayName: "ophcrack-cli", binary: "ophcrack-cli", category: "password", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["password", "cracking", "windows", "rainbow-table"] },
  { id: "reaver", displayName: "Reaver", binary: "reaver", category: "password", riskTier: "active", phase: "exploit", osiLayers: ["L1", "L2"], tags: ["password", "wifi", "wps", "bruteforce"] },
  { id: "wifite", displayName: "Wifite", binary: "wifite", category: "password", riskTier: "active", phase: "exploit", osiLayers: ["L1", "L2"], tags: ["password", "wifi", "automated", "wpa"] },
  { id: "fluxion", displayName: "Fluxion", binary: "fluxion", category: "password", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L1", "L2", "L7"], tags: ["password", "wifi", "evil-ap", "handshake"] },
  { id: "fern-wifi-cracker", displayName: "Fern Wifi Cracker", binary: "fern-wifi-cracker", category: "password", riskTier: "active", phase: "exploit", osiLayers: ["L1", "L2"], tags: ["password", "wifi", "wpa", "wep"] }
];
