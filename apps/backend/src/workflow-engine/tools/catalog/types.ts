import type { OsiLayer, ToolCategory, ToolRiskTier } from "@synosec/contracts";

export type ToolPhase = "recon" | "enum" | "vuln-scan" | "exploit" | "post" | "report" | "utility";

export interface ToolCatalogEntry {
  id: string;
  displayName: string;
  binary: string | null;
  category: ToolCategory;
  riskTier: ToolRiskTier;
  notes?: string;
  phase: ToolPhase;
  osiLayers: OsiLayer[];
  tags: string[];
}
