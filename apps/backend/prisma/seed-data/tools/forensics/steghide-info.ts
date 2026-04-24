import { loadSeedToolScript } from "../load-script.js";

export const steghideInfoTool = {
  id: "seed-steghide-info",
  name: "Steghide Info",
  description: "Inspect a local file with Steghide to identify embedded data metadata.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/steghide-info.sh");
  },
  capabilities: ["forensics", "steganography", "passive"],
  binary: "steghide",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around steghide info for local file inspection.",
  sandboxProfile: "read-only-parser" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    properties: {
      filePath: { type: "string" },
      passphrase: { type: "string" }
    },
    required: ["filePath"]
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
