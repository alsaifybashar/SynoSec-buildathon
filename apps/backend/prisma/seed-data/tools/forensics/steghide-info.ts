import { loadSeedToolScript } from "../load-script.js";

export const steghideInfoTool = {
  id: "seed-steghide-info",
  name: "Steghide Info",
  description: "Inspect a local file with Steghide-style checks for embedded data metadata and passphrase-protected payload signals. Use for suspected steganographic artifacts. Provide `filePath` and optional passphrase. Returns steganography observations; do not use for general metadata extraction.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/forensics/steghide-info.sh");
  },
  capabilities: ["forensics", "steganography", "passive"],
  binary: "steghide",
  category: "forensics" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for steghide info local file inspection.",
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
