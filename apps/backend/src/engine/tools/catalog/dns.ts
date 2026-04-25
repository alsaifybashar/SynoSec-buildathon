import type { ToolCatalogEntry } from "./types.js";

export const dnsTools: ToolCatalogEntry[] = [
  { id: "dnsenum", displayName: "DNSenum", binary: "dnsenum", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "enum", "zone-transfer"] },
  { id: "fierce", displayName: "Fierce", binary: "fierce", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "enum", "bruteforce"] },
  { id: "dnsrecon", displayName: "DNSRecon", binary: "dnsrecon", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "enum", "zone-transfer", "bruteforce"] },
  { id: "dnsdumpster", displayName: "DNSDumpster", binary: null, category: "dns", riskTier: "passive", notes: "Web service — API/browser access required.", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "osint", "passive"] },
  { id: "dig", displayName: "dig", binary: "dig", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "query", "utility"] },
  { id: "host", displayName: "host", binary: "host", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "query", "utility"] },
  { id: "whois", displayName: "WHOIS", binary: "whois", category: "dns", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L7"], tags: ["dns", "osint", "registrar"] }
];
