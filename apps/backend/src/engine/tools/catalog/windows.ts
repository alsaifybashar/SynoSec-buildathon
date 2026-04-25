import type { ToolCatalogEntry } from "./types.js";

export const windowsTools: ToolCatalogEntry[] = [
  { id: "crackmapexec", displayName: "CrackMapExec", binary: "crackmapexec", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "ad"] },
  { id: "enum4linux", displayName: "Enum4linux", binary: "enum4linux", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "enum"] },
  { id: "enum4linux-ng", displayName: "Enum4linux-ng", binary: "enum4linux-ng", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "enum"] },
  { id: "evil-winrm", displayName: "Evil-WinRM", binary: "evil-winrm", category: "windows", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L5", "L6", "L7"], tags: ["windows", "winrm", "shell"] },
  { id: "netexec", displayName: "NetExec", binary: "netexec", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "ad"] },
  { id: "responder", displayName: "Responder", binary: "responder", category: "windows", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L2", "L3", "L4", "L5", "L6", "L7"], tags: ["windows", "llmnr", "ntlm"] },
  { id: "mimikatz", displayName: "Mimikatz", binary: "mimikatz", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L6", "L7"], tags: ["windows", "credentials", "lsass", "kerberos"] },
  { id: "bloodhound", displayName: "BloodHound", binary: "bloodhound", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "ad", "graph", "attack-path"] },
  { id: "powersploit", displayName: "PowerSploit", binary: null, category: "windows", riskTier: "controlled-exploit", notes: "PowerShell post-exploitation framework; run via Import-Module.", phase: "post", osiLayers: ["L5", "L6", "L7"], tags: ["windows", "powershell", "post-exploit", "privesc"] },
  { id: "empire", displayName: "Empire (PowerShell Empire)", binary: "ps-empire", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "c2", "powershell", "post-exploit"] },
  { id: "nishang", displayName: "Nishang", binary: null, category: "windows", riskTier: "controlled-exploit", notes: "PowerShell offensive framework; run via Import-Module.", phase: "post", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "powershell", "post-exploit", "offensive"] },
  { id: "rubeus", displayName: "Rubeus", binary: "Rubeus", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "kerberos", "ad", "ticket"] },
  { id: "sharphound", displayName: "SharpHound", binary: "SharpHound", category: "windows", riskTier: "active", phase: "enum", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "ad", "bloodhound", "collector"] },
  { id: "smbexec", displayName: "SMBExec", binary: "smbexec", category: "windows", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "lateral-movement", "exec"] },
  { id: "evilginx", displayName: "Evilginx", binary: "evilginx", category: "windows", riskTier: "controlled-exploit", phase: "exploit", osiLayers: ["L5", "L6", "L7"], tags: ["windows", "phishing", "proxy", "mfa-bypass"] },
  { id: "psexec", displayName: "PSExec", binary: "psexec", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "lateral-movement", "remote-exec", "smb"] },
  { id: "powercat", displayName: "Powercat", binary: null, category: "windows", riskTier: "controlled-exploit", notes: "PowerShell netcat equivalent; run via Import-Module.", phase: "post", osiLayers: ["L4", "L7"], tags: ["windows", "powershell", "netcat", "reverse-shell"] },
  { id: "procdump", displayName: "Procdump", binary: "procdump", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["windows", "lsass", "dump", "credential-extract"] },
  { id: "covenant", displayName: "Covenant", binary: "dotnet", category: "windows", riskTier: "controlled-exploit", notes: "Run via `dotnet run` from source directory.", phase: "post", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "c2", "dotnet", "post-exploit"] },
  { id: "lazagne", displayName: "LaZagne", binary: "lazagne", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L7"], tags: ["windows", "credentials", "password-recovery", "post-exploit"] },
  { id: "impacket", displayName: "Impacket", binary: "impacket-scripts", category: "windows", riskTier: "controlled-exploit", phase: "post", osiLayers: ["L4", "L5", "L6", "L7"], tags: ["windows", "smb", "kerberos", "ad", "protocol-impl"] }
];
