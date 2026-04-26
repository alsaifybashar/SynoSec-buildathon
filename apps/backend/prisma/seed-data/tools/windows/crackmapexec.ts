import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const crackMapExecTool = {
  id: "seed-crackmapexec",
  name: "CrackMapExec",
  description: "Validate Windows network exposure and credentialed SMB/AD behavior on approved targets. Use when Windows lateral-movement or identity-path evidence is explicitly in scope. Provide target, service context, and credentials where required. Returns access/enumeration observations; do not use for unscoped exploitation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/crackmapexec.sh");
  },
  capabilities: ["windows","network","brute-force"],
  binary: "crackmapexec",
  category: "windows" as const,
  riskTier: "passive" as const,
  notes: "Raw adapter for CrackMapExec.",
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
