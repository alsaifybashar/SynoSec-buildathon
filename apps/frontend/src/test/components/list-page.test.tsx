import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListPage, type ListPageColumn } from "@/components/list-page";
import type { PaginatedResource } from "@/lib/resources";

type TestRow = {
  id: string;
  name: string;
  status: string;
};

const columns: ListPageColumn<TestRow>[] = [
  {
    id: "name",
    header: "Name",
    cell: (row) => row.name
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => <span>{row.status}</span>
  }
];

const items: TestRow[] = [
  { id: "app-1", name: "Operator Portal", status: "active" },
  { id: "app-2", name: "Billing API", status: "inactive" }
];

const meta: PaginatedResource<TestRow> = {
  items,
  page: 1,
  pageSize: 25,
  total: 2,
  totalPages: 1
};

describe("ListPage", () => {
  const createObjectURLMock = vi.fn<(blob: Blob) => string>();
  const revokeObjectURLMock = vi.fn<(url: string) => void>();
  const OriginalBlob = Blob;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createdLink: HTMLAnchorElement | null;

  beforeEach(() => {
    createdLink = null;
    createObjectURLMock.mockReturnValue("blob:test-export");

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURLMock
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock
    });

    vi.stubGlobal("Blob", class MockBlob {
      readonly parts: BlobPart[];
      readonly type: string;

      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        this.parts = parts;
        this.type = options?.type ?? "";
      }
    });

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === "a") {
        createdLink = element as HTMLAnchorElement;
      }
      return element;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.stubGlobal("Blob", OriginalBlob);
    vi.restoreAllMocks();
  });

  it("exports the current list view as an excel-friendly file", async () => {
    render(
      <ListPage
        title="Applications"
        recordLabel="Application"
        columns={columns}
        query={{
          page: 1,
          pageSize: 25,
          q: "",
          sortBy: "name",
          sortDirection: "asc"
        }}
        dataState={{ state: "loaded", data: meta }}
        items={items}
        meta={meta}
        emptyMessage="No applications found."
        onSearchChange={() => {}}
        onFilterChange={() => {}}
        onSortChange={() => {}}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onRetry={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(createdLink?.download).toBe("applications.xls");
    expect(createdLink?.href).toBe("blob:test-export");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-export");

    const blob = createObjectURLMock.mock.calls[0]?.[0] as { parts: BlobPart[]; type: string } | undefined;
    expect(blob?.type).toBe("application/vnd.ms-excel;charset=utf-8;");

    const workbook = String(blob?.parts[0] ?? "");
    expect(workbook).toContain("<th>Name</th>");
    expect(workbook).toContain("<th>Status</th>");
    expect(workbook).toContain("<td>Operator Portal</td>");
    expect(workbook).toContain("<td>Billing API</td>");
    expect(workbook).toContain("<td>active</td>");
    expect(workbook).toContain("<td>inactive</td>");
  });
});
