import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KNOWN_SCRIPT_BINARIES } from "@synosec/contracts";

function loadProfileManifest() {
  const manifestUrl = new URL("../docker/tool-profile-binaries.json", import.meta.url);
  return JSON.parse(readFileSync(manifestUrl, "utf8")) as Record<string, string[]>;
}

describe("connector tool profile manifest", () => {
  it("assigns every known connector binary to exactly one profile", () => {
    const manifest = loadProfileManifest();
    const seen = new Map<string, string>();

    for (const [profile, binaries] of Object.entries(manifest)) {
      for (const binary of binaries) {
        expect(seen.has(binary)).toBe(false);
        seen.set(binary, profile);
      }
    }

    expect([...seen.keys()].sort((left, right) => left.localeCompare(right))).toEqual(
      [...KNOWN_SCRIPT_BINARIES].sort((left, right) => left.localeCompare(right))
    );
  });
});
