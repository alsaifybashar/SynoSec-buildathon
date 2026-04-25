import { beforeEach, describe, expect, it, vi } from "vitest";
import { targetTransfer } from "@/features/targets/transfer";
import { importResourceRecords } from "@/shared/lib/resource-transfer";

const fetchJsonMock = vi.fn();

vi.mock("@/shared/lib/api", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args)
}));

describe("resource transfer", () => {
  beforeEach(() => {
    fetchJsonMock.mockReset();
  });

  it("rejects import files for the wrong table", async () => {
    const file = new File([
      JSON.stringify({
        version: 1,
        table: "ai-tools",
        exportedAt: "2026-04-21T08:00:00.000Z",
        records: [
          {
            id: "4bf3d9fc-7c5c-4b1e-92cf-ae1de66cae39",
            name: "Operator Portal",
            baseUrl: "https://portal.example.com",
            environment: "production",
            status: "active",
            lastScannedAt: "2026-04-20T08:00:00.000Z",
            createdAt: "2026-04-20T08:00:00.000Z",
            updatedAt: "2026-04-20T09:00:00.000Z"
          }
        ]
      })
    ], "wrong-table.json", { type: "application/json" });

    await expect(importResourceRecords(targetTransfer, file)).rejects.toThrow(
      'Import file targets table "ai-tools", but this view expects "targets".'
    );
    expect(fetchJsonMock).not.toHaveBeenCalled();
  });

  it("creates imported records when the json matches the exported shape", async () => {
    fetchJsonMock.mockResolvedValueOnce({ id: "created-app" });

    const file = new File([
      JSON.stringify({
        version: 1,
        table: "targets",
        exportedAt: "2026-04-21T08:00:00.000Z",
        records: [
          {
            id: "4bf3d9fc-7c5c-4b1e-92cf-ae1de66cae39",
            name: "Operator Portal",
            baseUrl: "https://portal.example.com",
            environment: "production",
            status: "active",
            lastScannedAt: "2026-04-20T08:00:00.000Z",
            createdAt: "2026-04-20T08:00:00.000Z",
            updatedAt: "2026-04-20T09:00:00.000Z"
          }
        ]
      })
    ], "targets.json", { type: "application/json" });

    const created = await importResourceRecords(targetTransfer, file);

    expect(created).toEqual([{ id: "created-app" }]);
    expect(fetchJsonMock).toHaveBeenCalledWith("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Operator Portal",
        baseUrl: "https://portal.example.com",
        environment: "production",
        status: "active",
        lastScannedAt: "2026-04-20T08:00:00.000Z"
      })
    });
  });
});
