import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const netExecTool = {
  id: "seed-netexec",
  name: "NetExec",
  description: "Validate credentialed network execution or enumeration paths on approved Windows targets. Use after SMB/WinRM services and candidate credentials are known. Provide target, protocol, and credentials where required. Returns access validation evidence; do not use for discovery-only scans.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/netexec.sh");
  },
  capabilities: ["windows","network","brute-force"],
  binary: "nxc",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for NetExec.",
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
