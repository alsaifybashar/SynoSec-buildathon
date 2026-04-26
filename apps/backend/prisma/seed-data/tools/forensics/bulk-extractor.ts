import { loadSeedToolScript } from "../load-script.js";

export const bulkExtractorTool = {
  id: "seed-bulk-extractor",
  name: "Bulk Extractor",
  description: "Extract features such as emails, URLs, tokens, identifiers, and other high-signal strings from digital evidence files. Use for forensic triage of collected artifacts or disk images. Provide `filePath`. Returns extracted-feature observations; validate sensitivity and relevance before reporting.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/bulk-extractor.sh");
  },
  capabilities: ["data-extraction","forensics"],
  binary: "bulk_extractor",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Bulk Extractor.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" },
      observations: { type: "array" }
    },
    required: ["output"]
  }
} as const;
