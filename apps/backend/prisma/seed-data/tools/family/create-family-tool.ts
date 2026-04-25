import { loadSeedToolScript } from "../load-script.js";

type SeededFamilyTool = {
  id: string;
  name: string;
  description: string;
  capabilities: readonly string[];
  binary: string | null;
  category: "web" | "network" | "subdomain" | "content";
  riskTier: "passive" | "active";
  notes: string;
  sandboxProfile: "network-recon" | "active-recon";
  privilegeProfile: "read-only-network" | "active-network";
  timeoutMs: number;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  primary: { name: string; bashSource: string };
  fallback: { name: string; bashSource: string };
};

function encodeBashSource(bashSource: string) {
  return Buffer.from(bashSource, "utf8").toString("base64");
}

export function createFamilyWrapperScript(input: {
  familyName: string;
  primary: { name: string; bashSource: string };
  fallback: { name: string; bashSource: string };
}) {
  return loadSeedToolScript(import.meta.url, "scripts/tools/family/execute-family-tool.sh")
    .replace("__FAMILY_NAME__", input.familyName)
    .replace("__PRIMARY_NAME__", input.primary.name)
    .replace("__PRIMARY_SOURCE_B64__", encodeBashSource(input.primary.bashSource))
    .replace("__FALLBACK_NAME__", input.fallback.name)
    .replace("__FALLBACK_SOURCE_B64__", encodeBashSource(input.fallback.bashSource));
}

export function createSeededFamilyTool(input: SeededFamilyTool) {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    executorType: "bash" as const,
    get bashSource() {
      return createFamilyWrapperScript({
        familyName: input.name,
        primary: input.primary,
        fallback: input.fallback
      });
    },
    capabilities: input.capabilities,
    binary: input.binary,
    category: input.category,
    riskTier: input.riskTier,
    notes: input.notes,
    sandboxProfile: input.sandboxProfile,
    privilegeProfile: input.privilegeProfile,
    timeoutMs: input.timeoutMs,
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema
  } as const;
}

