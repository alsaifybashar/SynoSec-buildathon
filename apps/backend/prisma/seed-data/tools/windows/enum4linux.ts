import { loadSeedToolScript } from "../load-script.js";
import { seededCredentialSteeringProperties } from "../shared/seeded-web-input-schema.js";

export const enum4linuxTool = {
  id: "seed-enum4linux",
  name: "Enum4linux",
  description: "Enumerate SMB shares, users, domains, policies, and Windows host metadata with enum4linux. Use after SMB or Windows services are identified and enumeration is in scope. Provide `target` and optional port or notes. Returns SMB/Windows observations; do not use for credential validation.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/windows/enum4linux.sh");
  },
  capabilities: ["windows-enum", "active-recon", "smb"],
  binary: "enum4linux",
  category: "windows" as const,
  riskTier: "active" as const,
  notes: "Raw adapter for enum4linux Windows/SMB enumeration.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: seededCredentialSteeringProperties,
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
