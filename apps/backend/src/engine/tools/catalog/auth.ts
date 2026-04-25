import type { ToolCatalogEntry } from "./types.js";

export const authTools: ToolCatalogEntry[] = [
  { id: "jwt-analyzer", displayName: "JWT Analyzer", binary: "node", category: "auth", riskTier: "passive", phase: "enum", osiLayers: ["L5", "L7"], tags: ["auth", "session", "jwt", "token", "claims"] },
  { id: "auth-flow-probe", displayName: "Auth Flow Probe", binary: "node", category: "auth", riskTier: "active", phase: "vuln-scan", osiLayers: ["L5", "L7"], tags: ["auth", "session", "login", "rate-limit", "timing-oracle"] }
];
