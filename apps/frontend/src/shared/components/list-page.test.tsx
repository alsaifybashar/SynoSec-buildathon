import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListPage, type ListPageColumn } from "@/shared/components/list-page";
import type { PaginatedResource } from "@/shared/lib/resource-client";

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

  it("exports the current list view as a csv file that excel can open cleanly", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(createdLink?.download).toBe("applications.csv");
    expect(createdLink?.href).toBe("blob:test-export");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-export");

    const blob = createObjectURLMock.mock.calls[0]?.[0] as { parts: BlobPart[]; type: string } | undefined;
    expect(blob?.type).toBe("text/csv;charset=utf-8;");

    expect(blob?.parts[0]).toBe("\uFEFF");

    const csv = String(blob?.parts[1] ?? "");
    expect(csv).toContain("\"Name\",\"Status\"");
    expect(csv).toContain("\"Operator Portal\",\"active\"");
    expect(csv).toContain("\"Billing API\",\"inactive\"");
  });

  it("renders a minimal import control and forwards the selected json file", () => {
    const handleImportJson = vi.fn();
    const { container } = render(
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
        onImportJson={handleImportJson}
      />
    );

    expect(screen.getByRole("button", { name: "Import JSON" })).toBeInTheDocument();

    const fileInput = container.querySelector("input[type='file']");
    expect(fileInput).not.toBeNull();

    const file = new File(["{}"], "applications.json", { type: "application/json" });
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] }
    });

    expect(handleImportJson).toHaveBeenCalledWith(file);
  });

  it("renders row actions and routes action clicks without triggering row navigation", async () => {
    const handleRowClick = vi.fn();
    const handleExportRowJson = vi.fn();
    const handleDeleteRow = vi.fn().mockResolvedValue(undefined);

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
        onRowClick={handleRowClick}
        getRowLabel={(row) => row.name}
        onExportRowJson={handleExportRowJson}
        onDeleteRow={handleDeleteRow}
      />
    );

    expect(screen.getAllByText("Actions")).not.toHaveLength(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Download Operator Portal as JSON" })[0]!);
    expect(handleExportRowJson).toHaveBeenCalledWith(items[0]);
    expect(handleRowClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete Operator Portal" })[0]!);
    expect(handleDeleteRow).not.toHaveBeenCalled();
    expect(screen.getAllByText("Delete Operator Portal?").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Confirm delete Operator Portal" })[0]!);
    });
    expect(handleDeleteRow).toHaveBeenCalledWith(items[0]);
    expect(handleRowClick).not.toHaveBeenCalled();
  });
});
