import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = path.resolve(__dirname, "..");
const appRoot = path.join(backendRoot, "app");
const featuresRoot = path.join(backendRoot, "features");

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  }));

  return files.flat();
}

function findImports(source: string) {
  return [...source.matchAll(/\b(?:import|export)\b[\s\S]*?\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]!);
}

function getFeatureName(filePath: string) {
  const relativePath = path.relative(featuresRoot, filePath);
  return relativePath.split(path.sep)[0] ?? null;
}

function resolveImportedFeature(filePath: string, specifier: string) {
  if (specifier.startsWith("@/features/")) {
    const parts = specifier.split("/");
    return {
      feature: parts[2] ?? null,
      deep: parts.length > 4 || (parts.length === 4 && parts[3] !== "index.js")
    };
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolvedPath = path.resolve(path.dirname(filePath), specifier);
  const relativePath = path.relative(featuresRoot, resolvedPath);
  if (relativePath.startsWith("..")) {
    return null;
  }

  const feature = relativePath.split(path.sep)[0] ?? null;
  return {
    feature,
    deep: feature !== null && getFeatureName(filePath) !== feature
  };
}

describe("backend feature boundaries", () => {
  it("prevents app code from deep-importing feature internals", async () => {
    const files = await collectTypeScriptFiles(appRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      for (const specifier of findImports(source)) {
        const imported = resolveImportedFeature(filePath, specifier);
        if (imported?.feature && imported.deep) {
          violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("prevents one feature from deep-importing another feature's internals", async () => {
    const files = await collectTypeScriptFiles(featuresRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      const owningFeature = getFeatureName(filePath);

      for (const specifier of findImports(source)) {
        const imported = resolveImportedFeature(filePath, specifier);
        if (!imported?.feature || imported.feature === owningFeature || !imported.deep) {
          continue;
        }
        violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
