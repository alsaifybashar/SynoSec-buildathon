import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const evilWinRMTool = {
  id: "seed-evil-winrm",
  name: "Evil-WinRM",
  description: "Validate WinRM remote-management access on an approved Windows host with supplied credentials or session context. Use only when remote access validation is explicitly in scope. Provide target, port, and credentials as needed. Returns connection evidence; do not use for SMB enumeration or broad scanning.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/evil-winrm.sh");
  },
  capabilities: ["windows","remote-shell"],
  binary: "evil-winrm",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for Evil-WinRM.",
  sandboxProfile: "network-recon" as const,
  privilegeProfile: "read-only-network" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: seededCredentialSteeringProperties
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
