import { loadSeedToolScript } from "../load-script.js";

export const evilWinRMTool = {
  id: "seed-evil-winrm",
  name: "Evil-WinRM",
  description: "The ultimate WinRM shell for pentesting.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/evil-winrm.sh");
  },
  capabilities: ["windows","remote-shell"],
  binary: "evil-winrm",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Wrapper around Evil-WinRM for seeded execution.",
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
