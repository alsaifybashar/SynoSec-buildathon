import type { ToolCatalogEntry } from "./types.js";

export const forensicsTools: ToolCatalogEntry[] = [
  { id: "bulk-extractor", displayName: "Bulk Extractor", binary: "bulk_extractor", category: "forensics", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["forensics", "disk", "artifact"] },
  { id: "exiftool", displayName: "ExifTool", binary: "exiftool", category: "forensics", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["forensics", "metadata", "files"] },
  { id: "foremost", displayName: "Foremost", binary: "foremost", category: "forensics", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["forensics", "carving", "disk"] },
  { id: "scalpel", displayName: "Scalpel", binary: "scalpel", category: "forensics", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["forensics", "carving", "files"] },
  { id: "steghide", displayName: "Steghide", binary: "steghide", category: "forensics", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["forensics", "steganography", "files"] },
  { id: "volatility3", displayName: "Volatility3", binary: "vol", category: "forensics", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["forensics", "memory", "analysis"] }
];
