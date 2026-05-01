import type { AiTool, ToolConstraintProfile } from "@synosec/contracts";
import type { SemanticFamilyDefinition } from "@/modules/ai-tools/semantic-family-tools.js";

const DEFAULT_DESCRIPTION_BUDGET = 600;

export type ToolCatalogEntryInput = {
  exposedName: string;
  tool?: AiTool;
  familyDefinition?: SemanticFamilyDefinition;
  literalDescription?: string;
};

export type ToolCatalogSectionInput = {
  title: string;
  entries: ToolCatalogEntryInput[];
};

export type WhenGuidance = {
  core: string;
  whenToUse?: string;
  whenNotTo?: string;
};

const USE_WHEN_RE = /(Use this when[^.]*\.)/i;
const DOES_NOT_RE = /((?:It does not|Does not)[^.]*\.)/i;

export function splitWhenGuidance(description: string | null | undefined): WhenGuidance {
  const raw = (description ?? "").trim();
  if (!raw) {
    return { core: "" };
  }

  const useMatch = raw.match(USE_WHEN_RE);
  const notMatch = raw.match(DOES_NOT_RE);
  let core = raw;
  if (useMatch) {
    core = core.replace(useMatch[0], "");
  }
  if (notMatch) {
    core = core.replace(notMatch[0], "");
  }
  core = core.replace(/\s+/g, " ").trim();

  const guidance: WhenGuidance = { core };
  if (useMatch) {
    guidance.whenToUse = useMatch[0].trim();
  }
  if (notMatch) {
    guidance.whenNotTo = notMatch[0].trim();
  }
  return guidance;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatList(values: readonly string[]): string {
  return values.length === 0 ? "—" : values.join(", ");
}

function formatConstraintProfile(profile: ToolConstraintProfile | undefined): string | null {
  if (!profile) {
    return null;
  }
  const parts: string[] = [
    `network=${profile.networkBehavior}`,
    `mutation=${profile.mutationClass}`
  ];
  if (profile.targetKinds.length > 0) {
    parts.push(`targetKinds=${profile.targetKinds.join("|")}`);
  }
  if (profile.supportsHostAllowlist) {
    parts.push("hostAllowlist");
  }
  if (profile.supportsPathExclusions) {
    parts.push("pathExclusions");
  }
  if (profile.supportsRateLimit) {
    parts.push("rateLimit");
  }
  return parts.join(", ");
}

function inputSchemaRequired(schema: unknown): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  const required = (schema as { required?: unknown }).required;
  if (!Array.isArray(required)) {
    return [];
  }
  return required.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function formatTool(entry: { exposedName: string; tool: AiTool; familyDefinition?: SemanticFamilyDefinition }): string {
  const { exposedName, tool, familyDefinition } = entry;
  const lines: string[] = [];
  const headerExtras: string[] = [];
  if (tool.riskTier) {
    headerExtras.push(`riskTier=${tool.riskTier}`);
  }
  if (tool.category) {
    headerExtras.push(`category=${tool.category}`);
  }
  const headerSuffix = headerExtras.length > 0 ? ` (${headerExtras.join(", ")})` : "";
  lines.push(`### ${exposedName}${headerSuffix}`);

  const guidance = splitWhenGuidance(tool.description);
  const core = guidance.core || tool.description?.trim() || tool.name;
  lines.push(truncate(core, DEFAULT_DESCRIPTION_BUDGET));

  if (tool.capabilities.length > 0) {
    lines.push(`Capabilities: ${formatList(tool.capabilities)}`);
  }

  const requiredInputs = familyDefinition?.requiredInputFields?.length
    ? familyDefinition.requiredInputFields
    : inputSchemaRequired(tool.inputSchema);
  if (requiredInputs.length > 0) {
    lines.push(`Required inputs: ${formatList(requiredInputs)}`);
  }

  const constraints = formatConstraintProfile(tool.constraintProfile);
  if (constraints) {
    lines.push(`Constraints: ${constraints}`);
  }

  if (guidance.whenToUse) {
    lines.push(`When to use: ${guidance.whenToUse}`);
  }
  if (guidance.whenNotTo) {
    lines.push(`When not to: ${guidance.whenNotTo}`);
  }

  return lines.join("\n");
}

function formatLiteral(entry: { exposedName: string; literalDescription: string }): string {
  return [`### ${entry.exposedName}`, entry.literalDescription.trim()].join("\n");
}

export function formatToolEntryForLLM(entry: ToolCatalogEntryInput): string | null {
  if (entry.tool) {
    return formatTool({ exposedName: entry.exposedName, tool: entry.tool, ...(entry.familyDefinition ? { familyDefinition: entry.familyDefinition } : {}) });
  }
  if (entry.literalDescription) {
    return formatLiteral({ exposedName: entry.exposedName, literalDescription: entry.literalDescription });
  }
  return null;
}

export function formatToolCatalogForLLM(sections: ToolCatalogSectionInput[]): string {
  return sections
    .map((section) => {
      const blocks = section.entries
        .map(formatToolEntryForLLM)
        .filter((block): block is string => Boolean(block));
      if (blocks.length === 0) {
        return null;
      }
      return [`## ${section.title}`, blocks.join("\n\n")].join("\n\n");
    })
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
}
