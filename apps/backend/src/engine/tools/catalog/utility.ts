import type { ToolCatalogEntry } from "./types.js";

export const utilityTools: ToolCatalogEntry[] = [
  { id: "cipher-identifier", displayName: "Cipher-Identifier", binary: "cipher-identifier", category: "utility", riskTier: "passive", phase: "utility", osiLayers: ["L6", "L7"], tags: ["utility", "crypto", "identify"] },
  { id: "shodan", displayName: "Shodan", binary: "shodan", category: "utility", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["utility", "osint", "internet-scan"] },
  { id: "recon-ng", displayName: "Recon-ng", binary: "recon-ng", category: "utility", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["utility", "osint", "framework"] },
  { id: "maltego", displayName: "Maltego", binary: null, category: "utility", riskTier: "passive", notes: "GUI application; automation via TRX API.", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["utility", "osint", "graph"] },
  { id: "spiderfoot", displayName: "SpiderFoot", binary: "spiderfoot", category: "utility", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["utility", "osint", "automation"] },
  { id: "phoneinfoga", displayName: "PhoneInfoga", binary: "phoneinfoga", category: "utility", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["utility", "osint", "phone"] },
  { id: "dmitry", displayName: "Dmitry", binary: "dmitry", category: "utility", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["utility", "osint", "passive"] },
  { id: "chad", displayName: "Chad", binary: "chad", category: "utility", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["utility", "osint", "github", "dorks"] }
];
