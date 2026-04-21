import { afterEach, describe, expect, it, vi } from "vitest";

describe("scan-store vulnerability loading", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("@/core/database/prisma-client.js");
  });

  it("fails loudly when a stored vulnerability row is malformed", async () => {
    vi.doMock("@/core/database/prisma-client.js", () => ({
      prisma: {
        scanFinding: {
          findMany: vi.fn(async () => ([
            {
              id: "finding-1",
              scanRunId: "scan-1",
              agentId: "agent-1",
              primaryLayer: "L7",
              relatedLayers: [],
              category: null,
              title: "Broken row",
              description: "This row is malformed.",
              impact: "unknown",
              recommendation: "fix storage",
              severity: "medium",
              confidence: 0.5,
              validationStatus: "single_source",
              target: { host: "example.com" },
              evidenceItems: [{ sourceTool: "tool", quote: "quote" }],
              technique: "test",
              reproduction: null,
              cwe: null,
              owasp: null,
              tags: [],
              createdAt: new Date("2026-04-21T00:00:00.000Z")
            }
          ]))
        }
      }
    }));

    const { getSecurityVulnerabilitiesForScan } = await import("./scan-store.js");

    await expect(getSecurityVulnerabilitiesForScan("scan-1")).rejects.toThrow(
      "Stored vulnerability finding-1 is missing required fields."
    );
  });
});
