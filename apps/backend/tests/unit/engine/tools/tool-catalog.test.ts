import { afterEach, describe, expect, it, vi } from "vitest";

describe("tool-catalog", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("node:child_process");
  });

  it("does not downgrade shell inspection failures into missing binaries", async () => {
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn((_file: string, _args: string[], _options: { timeout: number }, callback: (error: Error) => void) => {
        callback(new Error("spawn EPERM"));
      })
    }));

    const { getToolCapabilities } = await import("@/engine/tools/tool-catalog.js");

    await expect(getToolCapabilities()).rejects.toThrow("Failed to inspect binary amass: spawn EPERM");
  });

  it("still reports binaries as missing when command -v exits cleanly with status 1", async () => {
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn((_file: string, _args: string[], _options: { timeout: number }, callback: (error: NodeJS.ErrnoException | null) => void) => {
        const error = new Error("not found") as NodeJS.ErrnoException;
        error.code = "1";
        callback(error);
      })
    }));

    const { getToolCapabilities } = await import("@/engine/tools/tool-catalog.js");
    const payload = await getToolCapabilities();

    expect(payload.capabilities.find((capability) => capability.id === "amass")).toMatchObject({
      id: "amass",
      status: "missing",
      available: false
    });
  });

  it("marks installed status as a dependency check, not a wrapper execution guarantee", async () => {
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn((_file: string, _args: string[], _options: { timeout: number }, callback: (error: null, stdout?: string) => void) => {
        callback(null, "/usr/bin/amass\n");
      })
    }));

    const { getToolCapabilities } = await import("@/engine/tools/tool-catalog.js");
    const payload = await getToolCapabilities();

    expect(payload.capabilities.find((capability) => capability.id === "amass")).toMatchObject({
      id: "amass",
      status: "installed",
      available: true,
      notes: expect.stringContaining("Binary detected on PATH only")
    });
  });
});
