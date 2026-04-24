import type { ToolCatalogEntry } from "./types.js";

export const networkTools: ToolCatalogEntry[] = [
  { id: "autorecon", displayName: "AutoRecon", binary: "autorecon", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["network", "recon", "service-enum"] },
  { id: "masscan", displayName: "Masscan", binary: "masscan", category: "network", riskTier: "active", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "port-scan", "high-speed"] },
  { id: "ncat", displayName: "Ncat", binary: "ncat", category: "network", riskTier: "passive", phase: "enum", osiLayers: ["L4", "L7"], tags: ["network", "tcp", "banner-grab", "probe"] },
  { id: "netcat", displayName: "Netcat", binary: "nc", category: "network", riskTier: "passive", phase: "enum", osiLayers: ["L4", "L7"], tags: ["network", "tcp", "banner-grab", "probe"] },
  { id: "nmap", displayName: "Nmap", binary: "nmap", category: "network", riskTier: "passive", notes: "Implemented via network_scan/service_scan.", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["network", "port-scan", "service-enum"] },
  { id: "rustscan", displayName: "RustScan", binary: "rustscan", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "port-scan", "fast"] }
];
