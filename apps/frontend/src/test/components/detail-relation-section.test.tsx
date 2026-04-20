import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DetailRelationSection, type DetailRelationColumn } from "@/components/detail-relation-section";

type RuntimeRow = {
  id: string;
  name: string;
  status: string;
};

const columns: DetailRelationColumn<RuntimeRow>[] = [
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

const items: RuntimeRow[] = [
  { id: "rt-1", name: "Primary API", status: "healthy" },
  { id: "rt-2", name: "Worker Pool", status: "degraded" }
];

describe("DetailRelationSection", () => {
  it("renders the empty state when there are no related rows", () => {
    render(
      <DetailRelationSection
        title="Related runtimes"
        description="Linked runtime records."
        items={[]}
        columns={columns}
        emptyMessage="No linked runtimes yet."
        getRowId={(row) => row.id}
      />
    );

    expect(screen.getByText("Related runtimes")).toBeInTheDocument();
    expect(screen.getByText("Linked runtime records.")).toBeInTheDocument();
    expect(screen.getByText("No linked runtimes yet.")).toBeInTheDocument();
  });

  it("renders rows and triggers row actions", () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <DetailRelationSection
        title="Related runtimes"
        items={items}
        columns={columns}
        emptyMessage="No linked runtimes yet."
        getRowId={(row) => row.id}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getAllByText("Primary API").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Worker Pool").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Status").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(items[0]);
    expect(onDelete).toHaveBeenCalledWith(items[0]);
  });
});
