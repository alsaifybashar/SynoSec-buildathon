import type { ToolCatalogEntry } from "./types.js";

export const utilityTools: ToolCatalogEntry[] = [
  { id: "cipher-identifier", displayName: "Cipher-Identifier", binary: "cipher-identifier", category: "utility", riskTier: "passive", phase: "utility", osiLayers: ["L6", "L7"], tags: ["utility", "crypto", "identify"] }
];
