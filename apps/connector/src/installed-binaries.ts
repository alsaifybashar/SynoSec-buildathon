import { spawnSync } from "node:child_process";
import { KNOWN_SCRIPT_BINARIES } from "@synosec/contracts";

export function detectInstalledBinaries(): string[] {
  const installed: string[] = [];

  for (const binary of KNOWN_SCRIPT_BINARIES) {
    const result = spawnSync("sh", ["-lc", `command -v ${binary}`], {
      encoding: "utf8"
    });

    if (result.status === 0) {
      installed.push(binary);
    }
  }

  return installed.sort((left, right) => left.localeCompare(right));
}
