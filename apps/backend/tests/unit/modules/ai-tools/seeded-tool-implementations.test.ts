import { describe, expect, it } from "vitest";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";

describe("seeded tool implementations", () => {
  it("does not expose bash-backed seeded runtime tools", () => {
    expect(seededToolDefinitions).toEqual([]);
  });
});
