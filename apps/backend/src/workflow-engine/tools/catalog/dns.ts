import type { ToolCatalogEntry } from "./types.js";

export const dnsTools: ToolCatalogEntry[] = [
  { id: "dnsenum", displayName: "DNSenum", binary: "dnsenum", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "enum", "zone-transfer"] },
  { id: "fierce", displayName: "Fierce", binary: "fierce", category: "dns", riskTier: "passive", phase: "enum", osiLayers: ["L3", "L4", "L7"], tags: ["dns", "enum", "bruteforce"] }
];
