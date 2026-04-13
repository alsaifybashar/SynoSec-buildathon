import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  ToolCapabilitiesResponse,
  ToolCapability,
  ToolCategory,
  ToolRiskTier
} from "@synosec/contracts";

const execFileAsync = promisify(execFile);

interface ToolCatalogEntry {
  id: string;
  displayName: string;
  binary: string | null;
  category: ToolCategory;
  riskTier: ToolRiskTier;
  notes?: string;
}

const TOOL_CATALOG: ToolCatalogEntry[] = [
  { id: "amass", displayName: "Amass", binary: "amass", category: "subdomain", riskTier: "passive" },
  { id: "arjun", displayName: "Arjun", binary: "arjun", category: "web", riskTier: "passive" },
  { id: "autorecon", displayName: "AutoRecon", binary: "autorecon", category: "network", riskTier: "passive" },
  { id: "binwalk", displayName: "Binwalk", binary: "binwalk", category: "reversing", riskTier: "passive" },
  { id: "bulk-extractor", displayName: "Bulk Extractor", binary: "bulk_extractor", category: "forensics", riskTier: "passive" },
  { id: "burp-suite", displayName: "Burp Suite", binary: null, category: "web", riskTier: "active", notes: "Manual integration required." },
  { id: "checksec", displayName: "Checksec", binary: "checksec", category: "reversing", riskTier: "passive" },
  { id: "cipher-identifier", displayName: "Cipher-Identifier", binary: "cipher-identifier", category: "utility", riskTier: "passive" },
  { id: "crackmapexec", displayName: "CrackMapExec", binary: "crackmapexec", category: "windows", riskTier: "active" },
  { id: "dalfox", displayName: "Dalfox", binary: "dalfox", category: "web", riskTier: "active" },
  { id: "dirb", displayName: "Dirb", binary: "dirb", category: "content", riskTier: "passive" },
  { id: "dirsearch", displayName: "Dirsearch", binary: "dirsearch", category: "content", riskTier: "passive" },
  { id: "dnsenum", displayName: "DNSenum", binary: "dnsenum", category: "dns", riskTier: "passive" },
  { id: "enum4linux-ng", displayName: "Enum4linux-ng", binary: "enum4linux-ng", category: "windows", riskTier: "active" },
  { id: "evil-winrm", displayName: "Evil-WinRM", binary: "evil-winrm", category: "windows", riskTier: "controlled-exploit" },
  { id: "exiftool", displayName: "ExifTool", binary: "exiftool", category: "forensics", riskTier: "passive" },
  { id: "feroxbuster", displayName: "Feroxbuster", binary: "feroxbuster", category: "content", riskTier: "passive" },
  { id: "ffuf", displayName: "FFuf", binary: "ffuf", category: "content", riskTier: "passive", notes: "Implemented via content_discovery." },
  { id: "fierce", displayName: "Fierce", binary: "fierce", category: "dns", riskTier: "passive" },
  { id: "foremost", displayName: "Foremost", binary: "foremost", category: "forensics", riskTier: "passive" },
  { id: "gau", displayName: "Gau", binary: "gau", category: "content", riskTier: "passive" },
  { id: "gdb", displayName: "GDB", binary: "gdb", category: "reversing", riskTier: "passive" },
  { id: "ghidra", displayName: "Ghidra", binary: "ghidraRun", category: "reversing", riskTier: "passive" },
  { id: "gobuster", displayName: "Gobuster", binary: "gobuster", category: "content", riskTier: "passive" },
  { id: "hakrawler", displayName: "Hakrawler", binary: "hakrawler", category: "content", riskTier: "passive" },
  { id: "hashcat", displayName: "Hashcat", binary: "hashcat", category: "password", riskTier: "controlled-exploit" },
  { id: "hash-identifier", displayName: "Hash-Identifier", binary: "hash-identifier", category: "password", riskTier: "passive" },
  { id: "httpx", displayName: "HTTPx", binary: "httpx", category: "web", riskTier: "passive" },
  { id: "hydra", displayName: "Hydra", binary: "hydra", category: "password", riskTier: "controlled-exploit" },
  { id: "john", displayName: "John the Ripper", binary: "john", category: "password", riskTier: "controlled-exploit" },
  { id: "katana", displayName: "Katana", binary: "katana", category: "content", riskTier: "passive" },
  { id: "kube-bench", displayName: "Kube-bench", binary: "kube-bench", category: "kubernetes", riskTier: "passive" },
  { id: "kube-hunter", displayName: "Kube-hunter", binary: "kube-hunter", category: "kubernetes", riskTier: "active" },
  { id: "masscan", displayName: "Masscan", binary: "masscan", category: "network", riskTier: "active" },
  { id: "medusa", displayName: "Medusa", binary: "medusa", category: "password", riskTier: "controlled-exploit" },
  { id: "metasploit", displayName: "Metasploit Framework", binary: "msfconsole", category: "exploitation", riskTier: "controlled-exploit" },
  { id: "netexec", displayName: "NetExec", binary: "netexec", category: "windows", riskTier: "active" },
  { id: "nikto", displayName: "Nikto", binary: "nikto", category: "web", riskTier: "active", notes: "Implemented via nikto_scan." },
  { id: "nmap", displayName: "Nmap", binary: "nmap", category: "network", riskTier: "passive", notes: "Implemented via network_scan/service_scan." },
  { id: "nuclei", displayName: "Nuclei", binary: "nuclei", category: "web", riskTier: "active", notes: "Implemented via nuclei_scan." },
  { id: "objdump", displayName: "Objdump", binary: "objdump", category: "reversing", riskTier: "passive" },
  { id: "ophcrack", displayName: "Ophcrack", binary: "ophcrack", category: "password", riskTier: "controlled-exploit" },
  { id: "paramspider", displayName: "ParamSpider", binary: "paramspider", category: "web", riskTier: "passive" },
  { id: "patator", displayName: "Patator", binary: "patator", category: "password", riskTier: "controlled-exploit" },
  { id: "prowler", displayName: "Prowler", binary: "prowler", category: "cloud", riskTier: "passive" },
  { id: "radare2", displayName: "Radare2", binary: "r2", category: "reversing", riskTier: "passive" },
  { id: "responder", displayName: "Responder", binary: "responder", category: "windows", riskTier: "controlled-exploit" },
  { id: "rustscan", displayName: "RustScan", binary: "rustscan", category: "network", riskTier: "passive" },
  { id: "scalpel", displayName: "Scalpel", binary: "scalpel", category: "forensics", riskTier: "passive" },
  { id: "scout-suite", displayName: "Scout Suite", binary: "scout", category: "cloud", riskTier: "passive" },
  { id: "sqlmap", displayName: "SQLMap", binary: "sqlmap", category: "web", riskTier: "controlled-exploit", notes: "Implemented via db_injection_check." },
  { id: "steghide", displayName: "Steghide", binary: "steghide", category: "forensics", riskTier: "passive" },
  { id: "strings", displayName: "Strings", binary: "strings", category: "reversing", riskTier: "passive" },
  { id: "subfinder", displayName: "Subfinder", binary: "subfinder", category: "subdomain", riskTier: "passive" },
  { id: "theharvester", displayName: "TheHarvester", binary: "theHarvester", category: "subdomain", riskTier: "passive" },
  { id: "trivy", displayName: "Trivy", binary: "trivy", category: "cloud", riskTier: "passive" },
  { id: "volatility3", displayName: "Volatility3", binary: "vol", category: "forensics", riskTier: "passive" },
  { id: "waybackurls", displayName: "Waybackurls", binary: "waybackurls", category: "content", riskTier: "passive" },
  { id: "whatweb", displayName: "WhatWeb", binary: "whatweb", category: "web", riskTier: "passive", notes: "Implemented via web_fingerprint." }
];

let capabilityCache: { expiresAt: number; payload: ToolCapabilitiesResponse } | null = null;

async function binaryExists(binary: string): Promise<boolean> {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${binary}`], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export function getToolCatalog(): ToolCatalogEntry[] {
  return [...TOOL_CATALOG];
}

export async function getToolCapabilities(): Promise<ToolCapabilitiesResponse> {
  if (capabilityCache && capabilityCache.expiresAt > Date.now()) {
    return capabilityCache.payload;
  }

  const capabilities: ToolCapability[] = await Promise.all(
    TOOL_CATALOG.map(async (entry) => {
      if (entry.binary == null) {
        return {
          id: entry.id,
          displayName: entry.displayName,
          binary: null,
          category: entry.category,
          status: "manual",
          available: false,
          notes: entry.notes
        };
      }

      const available = await binaryExists(entry.binary);
      return {
        id: entry.id,
        displayName: entry.displayName,
        binary: entry.binary,
        category: entry.category,
        status: available ? "installed" : "missing",
        available,
        notes: entry.notes,
        implementedAdapter: implementedAdapterFor(entry.id)
      };
    })
  );

  const payload = { capabilities };
  capabilityCache = { expiresAt: Date.now() + 30_000, payload };
  return payload;
}

export async function isToolCatalogEntryAvailable(id: string): Promise<boolean> {
  const capabilities = await getToolCapabilities();
  return capabilities.capabilities.some((capability: ToolCapability) => capability.id === id && capability.available);
}

function implementedAdapterFor(id: string): ToolCapability["implementedAdapter"] | undefined {
  switch (id) {
    case "amass":
    case "subfinder":
      return "subdomain_enum";
    case "httpx":
      return "httpx_probe";
    case "katana":
      return "web_crawl";
    case "gau":
    case "waybackurls":
      return "historical_urls";
    case "feroxbuster":
      return "feroxbuster_scan";
    case "nmap":
      return "service_scan";
    case "nikto":
      return "nikto_scan";
    case "nuclei":
      return "nuclei_scan";
    case "whatweb":
      return "web_fingerprint";
    case "ffuf":
      return "content_discovery";
    case "sqlmap":
      return "db_injection_check";
    default:
      return "external_tool";
  }
}
