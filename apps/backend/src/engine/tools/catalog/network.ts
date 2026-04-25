import type { ToolCatalogEntry } from "./types.js";

export const networkTools: ToolCatalogEntry[] = [
  { id: "autorecon", displayName: "AutoRecon", binary: "autorecon", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["network", "recon", "service-enum"] },
  { id: "masscan", displayName: "Masscan", binary: "masscan", category: "network", riskTier: "active", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "port-scan", "high-speed"] },
  { id: "ncat", displayName: "Ncat", binary: "ncat", category: "network", riskTier: "passive", phase: "enum", osiLayers: ["L4", "L7"], tags: ["network", "tcp", "banner-grab", "probe"] },
  { id: "netcat", displayName: "Netcat", binary: "nc", category: "network", riskTier: "passive", phase: "enum", osiLayers: ["L4", "L7"], tags: ["network", "tcp", "banner-grab", "probe"] },
  { id: "nmap", displayName: "Nmap", binary: "nmap", category: "network", riskTier: "passive", notes: "Implemented via network_scan/service_scan.", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["network", "port-scan", "service-enum"] },
  { id: "rustscan", displayName: "RustScan", binary: "rustscan", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "port-scan", "fast"] },
  { id: "network-segment-map", displayName: "Network Segment Map", binary: "nmap", category: "topology", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4"], tags: ["topology", "network", "recon", "lateral", "trust-boundary"] },
  { id: "service-fingerprint", displayName: "Service Fingerprint", binary: "nmap", category: "topology", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["topology", "network", "service-enum", "cpe", "cve-correlation"] },
  { id: "tls-audit", displayName: "TLS Audit", binary: "openssl", category: "topology", riskTier: "passive", phase: "enum", osiLayers: ["L4", "L6"], tags: ["topology", "network", "tls", "ssl", "certificate", "trust-boundary"] },
  { id: "zmap", displayName: "ZMap", binary: "zmap", category: "network", riskTier: "active", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "port-scan", "internet-scale"] },
  { id: "fping", displayName: "fping", binary: "fping", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3"], tags: ["network", "ping", "host-discovery"] },
  { id: "hping3", displayName: "hping3", binary: "hping3", category: "network", riskTier: "active", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "packet-craft", "firewall-test"] },
  { id: "angry-ip-scanner", displayName: "Angry IP Scanner", binary: "ipscan", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4"], tags: ["network", "ip-scan", "host-discovery"] },
  { id: "asnmap", displayName: "ASNmap", binary: "asnmap", category: "network", riskTier: "passive", phase: "recon", osiLayers: ["L3"], tags: ["network", "asn", "cidr", "osint"] }
];
