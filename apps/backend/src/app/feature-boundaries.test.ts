import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = path.resolve(__dirname, "..");
const appRoot = path.join(backendRoot, "app");
const engineRoot = path.join(backendRoot, "engine");
const modulesRoot = path.join(backendRoot, "modules");
const sharedRoot = path.join(backendRoot, "shared");

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

function getTopLevelName(rootPath: string, filePath: string) {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath.split(path.sep)[0] ?? null;
}

function isPublicModuleSpecifier(specifier: string) {
  return /^@\/modules\/[^/]+(?:\/index\.js)?$/.test(specifier);
}

function isPublicEngineSpecifier(specifier: string) {
  return specifier === "@/engine/index.js";
}

function resolveImportedModule(filePath: string, specifier: string) {
  if (specifier.startsWith("@/modules/")) {
    const parts = specifier.split("/");
    return {
      module: parts[2] ?? null,
      deep: !isPublicModuleSpecifier(specifier)
    };
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolvedPath = path.resolve(path.dirname(filePath), specifier);
  const relativePath = path.relative(modulesRoot, resolvedPath);
  if (relativePath.startsWith("..")) {
    return null;
  }

  const module = relativePath.split(path.sep)[0] ?? null;
  return {
    module,
    deep: module !== null && getTopLevelName(modulesRoot, filePath) !== module
  };
}

describe("backend feature boundaries", () => {
  it("prevents app code from importing legacy feature or deep engine paths", async () => {
    const files = await collectTypeScriptFiles(appRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      for (const specifier of findImports(source)) {
        if (specifier.startsWith("@/features/")) {
          violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
        }
        if (specifier.startsWith("@/engine/") && !isPublicEngineSpecifier(specifier)) {
          violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("prevents app code from deep-importing module internals", async () => {
    const files = await collectTypeScriptFiles(appRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      for (const specifier of findImports(source)) {
        if (specifier.startsWith("@/modules/") && !isPublicModuleSpecifier(specifier)) {
          violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("prevents one module from deep-importing another module's internals", async () => {
    const files = await collectTypeScriptFiles(modulesRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      const owningModule = getTopLevelName(modulesRoot, filePath);

      for (const specifier of findImports(source)) {
        const imported = resolveImportedModule(filePath, specifier);
        if (!imported?.module || imported.module === owningModule || !imported.deep) {
          continue;
        }
        violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("prevents shared code from importing modules or engine internals", async () => {
    const files = await collectTypeScriptFiles(sharedRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      for (const specifier of findImports(source)) {
        if (specifier.startsWith("@/modules/") || specifier.startsWith("@/engine/")) {
          violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("prevents engine code from importing app internals", async () => {
    const files = await collectTypeScriptFiles(engineRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      for (const specifier of findImports(source)) {
        if (specifier.startsWith("@/app/")) {
          violations.push(`${path.relative(backendRoot, filePath)} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
