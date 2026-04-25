import type { ToolCatalogEntry } from "./types.js";

export const windowsTools: ToolCatalogEntry[] = [
  { id: "crackmapexec", displayName: "CrackMapExec", binary: "crackmapexec", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "ad"] },
  { id: "enum4linux", displayName: "Enum4linux", binary: "enum4linux", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "enum"] },
  { id: "enum4linux-ng", displayName: "Enum4linux-ng", binary: "enum4linux-ng", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "enum"] },
  { id: "evil-winrm", displayName: "Evil-WinRM", binary: "evil-winrm", category: "windows", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L5", "L6", "L7"], tags: ["windows", "winrm", "shell"] },
  { id: "netexec", displayName: "NetExec", binary: "netexec", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "ad"] },
  { id: "responder", displayName: "Responder", binary: "responder", category: "windows", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L2", "L3", "L4", "L5", "L6", "L7"], tags: ["windows", "llmnr", "ntlm"] }
];
