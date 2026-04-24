import type { ToolCatalogEntry } from "./types.js";

export const subdomainTools: ToolCatalogEntry[] = [
  { id: "amass", displayName: "Amass", binary: "amass", category: "subdomain", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["subdomain", "osint", "dns"] },
  { id: "sublist3r", displayName: "Sublist3r", binary: "sublist3r", category: "subdomain", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["subdomain", "osint", "dns"] },
  { id: "subfinder", displayName: "Subfinder", binary: "subfinder", category: "subdomain", riskTier: "passive", phase: "recon", osiLayers: ["L3", "L4", "L7"], tags: ["subdomain", "osint", "passive"] },
  { id: "theharvester", displayName: "TheHarvester", binary: "theHarvester", category: "subdomain", riskTier: "passive", phase: "recon", osiLayers: ["L7"], tags: ["subdomain", "osint", "email"] }
];
