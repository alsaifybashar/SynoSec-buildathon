import { loadSeedToolScript } from "../load-script.js";

export const bulkExtractorTool = {
  id: "seed-bulk-extractor",
  name: "Bulk Extractor",
  description: "Extracts features such as email addresses, credit card numbers, URLs, and other types of information from digital evidence files.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/bulk-extractor.sh");
  },
  capabilities: ["data-extraction","forensics"],
  binary: "bulk_extractor",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Bulk Extractor for seeded execution.",
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
