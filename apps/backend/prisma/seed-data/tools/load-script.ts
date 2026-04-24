import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function loadSeedToolScript(importMetaUrl: string, scriptPathFromRepoRoot: string) {
  const toolDir = dirname(fileURLToPath(importMetaUrl));
  const candidatePaths = [
    join(toolDir, "../../../../../../", scriptPathFromRepoRoot),
    join(toolDir, "../../../../../../../", scriptPathFromRepoRoot)
  ];

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return readFileSync(candidatePath, "utf-8");
    }
  }

  throw new Error(`Seeded tool script not found for ${scriptPathFromRepoRoot}. Checked: ${candidatePaths.join(", ")}`);
}
