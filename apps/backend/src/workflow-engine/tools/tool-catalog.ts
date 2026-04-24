import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  ToolCapabilitiesResponse,
  ToolCapability,
} from "@synosec/contracts";
import { TOOL_CATALOG, type ToolCatalogEntry } from "./catalog/index.js";

const execFileAsync = promisify(execFile);

const ids = new Set<string>();
for (const entry of TOOL_CATALOG) {
  if (ids.has(entry.id)) {
    throw new Error(`Duplicate catalog ID: ${entry.id}`);
  }

  ids.add(entry.id);
}

let capabilityCache: { expiresAt: number; payload: ToolCapabilitiesResponse } | null = null;

async function binaryExists(binary: string): Promise<boolean> {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${binary}`], { timeout: 3000 });
    return true;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
    const signal = typeof error === "object" && error !== null && "signal" in error ? (error as { signal?: unknown }).signal : undefined;

    if ((code === 1 || code === "1") && signal == null) {
      return false;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to inspect binary ${binary}: ${message}`);
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
        implementedBy: "script"
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
