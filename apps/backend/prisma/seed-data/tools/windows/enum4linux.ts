import { loadSeedToolScript } from "../load-script.js";

export const enum4linuxTool = {
  id: "seed-enum4linux",
  name: "Enum4linux",
  description: "Enumerate SMB shares, users, and Windows host details with enum4linux.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/enum4linux.sh");
  },
  capabilities: ["windows-enum", "active-recon", "smb"],
  binary: "enum4linux",
  category: "windows" as const,
  riskTier: "active" as const,
  notes: "Wrapper around enum4linux for Windows/SMB enumeration.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" }
    },
    required: ["target"]
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
