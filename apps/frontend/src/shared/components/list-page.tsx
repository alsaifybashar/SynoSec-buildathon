import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, isValidElement, startTransition, type MouseEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Check, ChevronsLeft, ChevronsRight, Download, FileUp, Filter as FilterIcon, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { PageHeader } from "@/shared/components/page-header";
import { cn } from "@/shared/lib/utils";
import { listPageSizes, type ListQueryState, type PaginatedResource } from "@/shared/lib/resource-client";

type ListDataState<T> =
  | { state: "loading"; data: PaginatedResource<T> | null }
  | { state: "loaded"; data: PaginatedResource<T> }
  | { state: "error"; data: PaginatedResource<T> | null; message: string };

export type ListPageColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

export type ListPageFilterRenderProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

export type ListPageFilter = {
  id: string;
  label: string;
  placeholder: string;
  allLabel: string;
  options: Array<{ label: string; value: string }>;
  /**
   * Optional plug-in renderer. When provided, this replaces the default Select widget
   * for the filter inside the filter panel — allowing custom controls (date pickers,
   * multi-selects, etc.) while keeping the panel layout consistent.
   */
  render?: (props: ListPageFilterRenderProps) => ReactNode;
};

const CLEAR_FILTER_VALUE = "__all__";
const TABLE_HEADER_TEXT_CLASSNAME = "font-mono text-eyebrow font-medium uppercase tracking-[0.24em]";

function extractText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractText(child)).filter(Boolean).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return "";
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function SelectionCheckbox({
  checked,
  indeterminate,
  ariaLabel,
  onChange,
  onClick
}: {
  checked: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate ?? false}
      onCheckedChange={onChange}
      aria-label={ariaLabel}
      {...(onClick ? { onClick } : {})}
    />
  );
}

function ListPageBulkMenu({
  recordLabel,
  selectedCount,
  onDeleteSelected,
  onExportCsv,
  onImportClick
}: {
  recordLabel: string;
  selectedCount: number;
  onDeleteSelected?: () => void;
  onExportCsv: () => void;
  onImportClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function runItem(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={containerRef} className="relative md:shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9"
        title="More actions"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+4px)] z-20 w-56 overflow-hidden rounded-md border border-border bg-popover py-1 text-xs shadow-md"
        >
          <p className="px-3 py-1.5 font-mono text-eyebrow uppercase tracking-[0.2em] text-muted-foreground">
            Bulk actions
          </p>
          <button
            type="button"
            role="menuitem"
            disabled={!onDeleteSelected || selectedCount === 0}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:text-muted-foreground/70 disabled:hover:bg-transparent"
            title={
              !onDeleteSelected
                ? `Bulk delete is not available for ${recordLabel.toLowerCase()}s`
                : selectedCount === 0
                ? `Select ${recordLabel.toLowerCase()}s to enable bulk delete`
                : `Delete ${selectedCount} selected ${recordLabel.toLowerCase()}${selectedCount === 1 ? "" : "s"}`
            }
            onClick={onDeleteSelected ? () => runItem(onDeleteSelected) : undefined}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
          <div className="my-1 border-t border-border" />
          <p className="px-3 py-1.5 font-mono text-eyebrow uppercase tracking-[0.2em] text-muted-foreground">
            Download / Export
          </p>
          <button
            type="button"
            role="menuitem"
            aria-label="Export CSV"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
            onClick={() => runItem(onExportCsv)}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          {onImportClick ? (
            <button
              type="button"
              role="menuitem"
              aria-label="Import JSON"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
              onClick={() => runItem(onImportClick)}
            >
              <FileUp className="h-3.5 w-3.5" />
              Import JSON
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ListPageFilterMenu({
  filters,
  query,
  onFilterChange,
  filterSlot,
  activeCount,
  onClearAll
}: {
  filters: ListPageFilter[];
  query: ListQueryState;
  onFilterChange: (key: string, value: string | undefined) => void;
  filterSlot?: ReactNode;
  activeCount: number;
  onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const hasFilters = filters.length > 0 || Boolean(filterSlot);

  if (!hasFilters) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative md:shrink-0">
      <Button
        type="button"
        variant="outline"
        className="h-9 gap-2 text-xs"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <FilterIcon className="h-3.5 w-3.5" />
        Filters
        {activeCount > 0 ? (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[0.625rem] font-medium text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-label="Filters"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-72 overflow-hidden rounded-sm border border-border bg-popover text-xs shadow-md md:w-80"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="font-mono text-eyebrow uppercase tracking-[0.2em] text-muted-foreground">
              Filters
            </p>
            {activeCount > 0 ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClearAll();
                }}
              >
                Clear all
              </button>
            ) : null}
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-auto px-3 py-3">
            {filters.map((filter) => {
              const rawValue = query[filter.id];
              const currentValue = typeof rawValue === "string" ? rawValue : undefined;

              return (
                <div key={filter.id} className="space-y-1.5">
                  <label className="block font-mono text-eyebrow uppercase tracking-[0.18em] text-muted-foreground">
                    {filter.label}
                  </label>
                  {filter.render ? (
                    filter.render({
                      value: currentValue,
                      onChange: (value) => {
                        startTransition(() => onFilterChange(filter.id, value));
                      }
                    })
                  ) : (
                    <Select
                      value={currentValue ?? CLEAR_FILTER_VALUE}
                      onValueChange={(value) => {
                        startTransition(() =>
                          onFilterChange(filter.id, value === CLEAR_FILTER_VALUE ? undefined : value)
                        );
                      }}
                    >
                      <SelectTrigger aria-label={filter.label} className="h-9 text-xs">
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CLEAR_FILTER_VALUE}>{filter.allLabel}</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
            {filterSlot ? <div className="space-y-1.5">{filterSlot}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ListPage<T extends { id: string }>({
  title,
  recordLabel,
  columns,
  query,
  dataState,
  items,
  meta,
  filters = [],
  filterSlot,
  emptyMessage,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onAddRecord,
  showAddRecord = true,
  onRowClick,
  onImportJson,
  getRowLabel,
  onExportRowJson,
  onDeleteRow,
  canExportRow,
  canDeleteRow
}: {
  title: string;
  recordLabel: string;
  columns: ListPageColumn<T>[];
  query: ListQueryState;
  dataState: ListDataState<T>;
  items: T[];
  meta: PaginatedResource<T>;
  filters?: ListPageFilter[];
  /**
   * Plug/slot for injecting custom filter UI into the filter panel,
   * in addition to (or instead of) the declarative `filters` array.
   */
  filterSlot?: ReactNode;
  emptyMessage: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string | undefined) => void;
  onSortChange: (columnId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  onAddRecord?: () => void;
  showAddRecord?: boolean;
  onRowClick?: (row: T) => void;
  onImportJson?: (file: File) => void | Promise<void>;
  getRowLabel?: (row: T) => string;
  onExportRowJson?: (row: T) => void | Promise<void>;
  onDeleteRow?: (row: T) => void | Promise<void>;
  canExportRow?: (row: T) => boolean;
  canDeleteRow?: (row: T) => boolean;
}) {
  const importInputId = useId();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const showRowActions = Boolean(onExportRowJson || onDeleteRow);
  const selectableIds = items
    .filter((row) => (onDeleteRow ? (canDeleteRow?.(row) ?? true) : true))
    .map((row) => row.id);
  const selectedOnPage = selectableIds.filter((id) => selectedIds.has(id));
  const allSelectedOnPage = selectableIds.length > 0 && selectedOnPage.length === selectableIds.length;
  const someSelectedOnPage = selectedOnPage.length > 0 && !allSelectedOnPage;

  useEffect(() => {
    setSelectedIds((current) => {
      const visible = new Set(items.map((row) => row.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (visible.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [items]);

  function toggleRowSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleAllOnPage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        for (const id of selectableIds) {
          next.add(id);
        }
      } else {
        for (const id of selectableIds) {
          next.delete(id);
        }
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    if (!onDeleteRow || selectedIds.size === 0 || bulkDeleting) {
      return;
    }

    const targets = items.filter((row) => selectedIds.has(row.id) && (canDeleteRow?.(row) ?? true));
    if (targets.length === 0) {
      return;
    }

    const confirmed = typeof window !== "undefined"
      ? window.confirm(`Delete ${targets.length} ${recordLabel.toLowerCase()}${targets.length === 1 ? "" : "s"}? This action cannot be undone.`)
      : true;
    if (!confirmed) {
      return;
    }

    setBulkDeleting(true);
    let succeeded = 0;
    const failures: string[] = [];
    for (const row of targets) {
      try {
        await onDeleteRow(row);
        succeeded += 1;
        setSelectedIds((current) => {
          if (!current.has(row.id)) {
            return current;
          }
          const next = new Set(current);
          next.delete(row.id);
          return next;
        });
      } catch (error) {
        const label = getRowLabel?.(row) ?? row.id;
        failures.push(`${label}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    setBulkDeleting(false);

    if (succeeded > 0) {
      toast.success(`${succeeded} ${recordLabel.toLowerCase()}${succeeded === 1 ? "" : "s"} deleted`);
    }
    if (failures.length > 0) {
      toast.error(`${failures.length} deletion${failures.length === 1 ? "" : "s"} failed`, {
        description: failures.slice(0, 3).join("\n")
      });
    }
  }

  function handleDefaultAddRecord() {
    toast("Coming soon", {
      description: `Add ${recordLabel.toLowerCase()} is coming soon.`
    });
  }

  function handleDefaultRowClick() {
    toast("Coming soon", {
      description: `${recordLabel} detail is coming soon.`
    });
  }

  function handleExportExcel() {
    if (items.length === 0) {
      toast("Nothing to export", {
        description: `There are no ${recordLabel.toLowerCase()}s in the current view.`
      });
      return;
    }

    const csv = [
      columns.map((column) => escapeCsv(column.header)).join(","),
      ...items.map((row) => columns.map((column) => escapeCsv(extractText(column.cell(row)))).join(","))
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileBaseName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    link.href = url;
    link.download = `${fileBaseName || "export"}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    if (file && onImportJson) {
      void onImportJson(file);
    }

    event.target.value = "";
  }

  function stopRowClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  async function handleDeleteRow(row: T, event: MouseEvent<HTMLButtonElement>) {
    stopRowClick(event);
    if (!onDeleteRow) {
      return;
    }

    const rowLabel = getRowLabel?.(row) ?? row.id;
    setDeletingId(row.id);
    try {
      await onDeleteRow(row);
      setConfirmDeleteId(null);
      toast.success(`${recordLabel} deleted`, {
        description: `${rowLabel} was deleted.`
      });
    } catch (error) {
      toast.error(`${recordLabel} deletion failed`, {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleExportRow(row: T, event: MouseEvent<HTMLButtonElement>) {
    stopRowClick(event);
    if (!onExportRowJson) {
      return;
    }

    setExportingId(row.id);
    try {
      await onExportRowJson(row);
    } catch (error) {
      toast.error(`${recordLabel} export failed`, {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setExportingId((current) => (current === row.id ? null : current));
    }
  }

  function renderRowActions(row: T) {
    const rowLabel = getRowLabel?.(row) ?? row.id;
    const canExport = onExportRowJson ? (canExportRow?.(row) ?? true) : false;
    const canDelete = onDeleteRow ? (canDeleteRow?.(row) ?? true) : false;
    const confirmingDelete = confirmDeleteId === row.id;
    const deleting = deletingId === row.id;
    const exporting = exportingId === row.id;

    if (confirmingDelete && canDelete && onDeleteRow) {
      return (
        <div className="flex min-w-[16rem] flex-col items-end gap-2 text-right">
          <div className="inline-flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-left">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">Delete {rowLabel}?</p>
              <p className="text-xs leading-5 text-muted-foreground">This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={`Cancel delete ${rowLabel}`}
              title="Cancel"
              onClick={(event) => {
                stopRowClick(event);
                setConfirmDeleteId(null);
              }}
              disabled={deleting}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              aria-label={`Confirm delete ${rowLabel}`}
              title="Confirm delete"
              onClick={(event) => {
                void handleDeleteRow(row, event);
              }}
              disabled={deleting}
            >
              {deleting ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2">
        {canExport && onExportRowJson ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={`Download ${rowLabel} as JSON`}
            title="Download JSON"
            onClick={(event) => {
              void handleExportRow(row, event);
            }}
            disabled={exporting}
          >
            {exporting ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
        ) : null}
        {canDelete && onDeleteRow ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${rowLabel}`}
            title="Delete record"
            onClick={(event) => {
              stopRowClick(event);
              setConfirmDeleteId(row.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    );
  }

  function renderColumnHeader(column: ListPageColumn<T>, loading = false) {
    if (column.sortable === false) {
      return column.header;
    }

    return (
      <button
        className={cn("group/sort inline-flex items-center gap-1.5", TABLE_HEADER_TEXT_CLASSNAME)}
        type="button"
        onClick={loading ? undefined : () => onSortChange(column.id)}
        disabled={loading}
      >
        {column.header}
        {loading ? (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/0" aria-hidden="true" />
        ) : query.sortBy === column.id ? (
          query.sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>
    );
  }

  const activeFilterCount = useMemo(
    () => filters.reduce((count, filter) => count + (typeof query[filter.id] === "string" ? 1 : 0), 0),
    [filters, query]
  );

  const pageLabel = meta.total === 0
    ? "0 results"
    : `${(meta.page - 1) * meta.pageSize + 1}-${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}`;
  const visiblePageNumbers = meta.totalPages === 0
    ? []
    : [meta.page, meta.page + 1, meta.page + 2].filter((page, index, values) => page <= meta.totalPages && values.indexOf(page) === index);
  return (
    <div className="space-y-3 pb-6">
      <PageHeader title={title} breadcrumbs={["Start", title]} />

      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex flex-col gap-2.5 px-3 py-2.5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <ListPageBulkMenu
              recordLabel={recordLabel}
              selectedCount={selectedIds.size}
              onExportCsv={handleExportExcel}
              {...(onDeleteRow ? { onDeleteSelected: () => { void handleBulkDelete(); } } : {})}
              {...(onImportJson
                ? { onImportClick: () => importInputRef.current?.click() }
                : {})}
            />
            {onImportJson ? (
              <input
                id={importInputId}
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={handleImportChange}
              />
            ) : null}

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query.q ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => onSearchChange(value));
                }}
                placeholder={`search ${recordLabel.toLowerCase()}s`}
                className="h-9 pl-9 font-mono text-xs placeholder:normal-case placeholder:text-muted-foreground/70"
              />
            </div>

            <ListPageFilterMenu
              filters={filters}
              query={query}
              onFilterChange={onFilterChange}
              {...(filterSlot ? { filterSlot } : {})}
              activeCount={activeFilterCount}
              onClearAll={() => {
                startTransition(() => {
                  for (const filter of filters) {
                    if (typeof query[filter.id] === "string") {
                      onFilterChange(filter.id, undefined);
                    }
                  }
                });
              }}
            />

            {showAddRecord ? (
              <Button onClick={onAddRecord ?? handleDefaultAddRecord} className="h-9 text-sm md:shrink-0">
                <Plus className="h-4 w-4" />
                Add {recordLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden bg-background">
        <div>
          {dataState.state === "loading" && !dataState.data ? (
            <>
              <div className="mx-3 grid gap-3 md:hidden">
                <Card>
                  <CardContent className="flex min-h-32 items-center justify-center py-8">
                    <Spinner className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn("w-[1%] border-b border-b-border border-t border-t-border bg-muted/40")} />
                      {columns.map((column) => (
                        <TableHead key={column.id} className={cn("border-b border-b-border border-t border-t-border bg-muted/40 text-muted-foreground", TABLE_HEADER_TEXT_CLASSNAME, column.className)}>
                          {renderColumnHeader(column, true)}
                        </TableHead>
                      ))}
                      {showRowActions ? (
                        <TableHead className={cn("border-b border-b-border border-t border-t-border bg-muted/40 text-right text-muted-foreground", TABLE_HEADER_TEXT_CLASSNAME)}>
                          Actions
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent">
                      <TableCell />
                      {columns.map((column, columnIndex) => (
                        <TableCell key={`${column.id}-loading`} className={column.className}>
                          {columnIndex === 0 ? (
                            <div className="flex items-center justify-center text-muted-foreground">
                              <Spinner className="h-3.5 w-3.5" />
                            </div>
                          ) : null}
                        </TableCell>
                      ))}
                      {showRowActions ? <TableCell /> : null}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          ) : dataState.state === "error" ? (
            <div className="mx-6 my-6 flex min-h-72 flex-col items-center justify-center gap-5 rounded-2xl border border-destructive/15 bg-[radial-gradient(circle_at_top,hsl(var(--destructive)/0.06),transparent_58%)] px-6 py-10 text-center">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-destructive/80">Loading Failed</p>
                <p className="text-base font-medium text-foreground">The list could not be loaded.</p>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">{dataState.message}</p>
              </div>
              <Button onClick={onRetry} variant="outline" className="min-w-32 border-destructive/25">
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="mx-6 mb-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <>
              <div className="mx-3 grid gap-3 md:hidden">
                {items.map((row) => {
                  const rowSelected = selectedIds.has(row.id);
                  const rowSelectable = onDeleteRow ? (canDeleteRow?.(row) ?? true) : true;
                  const rowLabelForA11y = getRowLabel?.(row) ?? row.id;
                  return (
                  <Card
                    key={row.id}
                    data-state={rowSelected ? "selected" : undefined}
                    {...(rowSelectable ? { "aria-selected": rowSelected } : {})}
                    className={cn(
                      "cursor-pointer border-border/70 transition-colors duration-150 hover:border-primary/30 hover:bg-accent/20",
                      rowSelected && "border-primary/40 bg-accent/30"
                    )}
                    onClick={() => (onRowClick ? onRowClick(row) : handleDefaultRowClick())}
                  >
                    <CardContent className="space-y-4 px-4 py-4">
                      <div onClick={stopRowClick}>
                        <SelectionCheckbox
                          ariaLabel={`Select ${rowLabelForA11y}`}
                          checked={rowSelected}
                          onChange={(checked) => rowSelectable && toggleRowSelection(row.id, checked)}
                          onClick={stopRowClick}
                        />
                      </div>
                      {columns.map((column) => (
                        <div key={column.id} className="space-y-1.5">
                          <p className="text-eyebrow font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {column.header}
                          </p>
                          <div className="text-xs text-foreground">
                            {column.cell(row)}
                          </div>
                        </div>
                      ))}
                      {showRowActions ? (
                        <div className="border-t border-border/70 pt-3" onClick={stopRowClick}>
                          {renderRowActions(row)}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <Table aria-multiselectable={onDeleteRow ? true : undefined}>
                  <TableHeader>
                    <TableRow className="group/header hover:bg-transparent">
                      <TableHead className={cn("w-[1%] border-b border-b-border border-t border-t-border bg-muted/40")}>
                        <div
                          className={cn(
                            "flex items-center justify-center transition-opacity duration-150",
                            allSelectedOnPage || someSelectedOnPage
                              ? "opacity-100"
                              : "opacity-0 group-hover/header:opacity-100 focus-within:opacity-100"
                          )}
                        >
                          <SelectionCheckbox
                            ariaLabel={`Select all ${recordLabel.toLowerCase()}s on this page`}
                            checked={allSelectedOnPage}
                            indeterminate={someSelectedOnPage}
                            onChange={toggleAllOnPage}
                          />
                        </div>
                      </TableHead>
                      {columns.map((column) => (
                        <TableHead key={column.id} className={cn("border-b border-b-border border-t border-t-border bg-muted/40 text-muted-foreground", TABLE_HEADER_TEXT_CLASSNAME, column.className)}>
                          {renderColumnHeader(column)}
                        </TableHead>
                      ))}
                      {showRowActions ? (
                        <TableHead className={cn("border-b border-b-border border-t border-t-border bg-muted/40 text-right text-muted-foreground", TABLE_HEADER_TEXT_CLASSNAME)}>
                          Actions
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => {
                      const rowSelectable = onDeleteRow ? (canDeleteRow?.(row) ?? true) : true;
                      const rowSelected = selectedIds.has(row.id);
                      const rowLabelForA11y = getRowLabel?.(row) ?? row.id;
                      return (
                      <TableRow
                        key={row.id}
                        data-state={rowSelected ? "selected" : undefined}
                        {...(rowSelectable ? { "aria-selected": rowSelected } : {})}
                        className={cn(
                          "group/row cursor-pointer border-l-2 border-l-transparent transition-colors duration-150 hover:border-l-primary hover:bg-accent/30",
                          rowSelected && "border-l-primary bg-accent/30"
                        )}
                        onClick={() => (onRowClick ? onRowClick(row) : handleDefaultRowClick())}
                      >
                        <TableCell className="w-[1%] align-middle text-xs" onClick={stopRowClick}>
                          <div
                            className={cn(
                              "flex items-center justify-center transition-opacity duration-150",
                              rowSelected
                                ? "opacity-100"
                                : "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100"
                            )}
                          >
                            <SelectionCheckbox
                              ariaLabel={`Select ${rowLabelForA11y}`}
                              checked={rowSelected}
                              onChange={(checked) => rowSelectable && toggleRowSelection(row.id, checked)}
                              onClick={stopRowClick}
                            />
                          </div>
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell key={column.id} className={cn("text-xs", column.className)}>
                            {column.cell(row)}
                          </TableCell>
                        ))}
                        {showRowActions ? (
                          <TableCell className="w-[1%] min-w-[13rem] align-top text-xs">
                            <div onClick={stopRowClick}>
                              {renderRowActions(row)}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 border-t border-border/70 px-3 py-4 text-xs text-muted-foreground md:grid-cols-3 md:items-center">
                <div className="flex flex-wrap items-center justify-start gap-3">
                  <div className="w-full shrink-0 md:w-[9.375rem]">
                    <Select
                      value={String(query.pageSize)}
                      onValueChange={(value) => {
                        startTransition(() => onPageSizeChange(Number(value)));
                      }}
                    >
                      <SelectTrigger aria-label="Page size" className="h-9 text-xs">
                        <SelectValue placeholder="Page size" />
                      </SelectTrigger>
                      <SelectContent>
                        {listPageSizes.map((pageSize) => (
                          <SelectItem key={pageSize} value={String(pageSize)}>
                            {pageSize} / page
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-center">
                  <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => onPageChange(1)} disabled={meta.page <= 1}>
                    <ChevronsLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">First</span>
                  </Button>
                  <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => onPageChange(Math.max(1, meta.page - 1))} disabled={meta.page <= 1}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  {visiblePageNumbers.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={pageNumber === meta.page ? "default" : "outline"}
                      className="h-9 min-w-9 text-sm"
                      onClick={() => onPageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-sm"
                    onClick={() => onPageChange(meta.page + 1)}
                    disabled={meta.totalPages === 0 || meta.page >= meta.totalPages}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-sm"
                    onClick={() => onPageChange(meta.totalPages)}
                    disabled={meta.totalPages === 0 || meta.page >= meta.totalPages}
                  >
                    <span className="hidden sm:inline">Last</span>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-start gap-3 md:justify-end">
                  <span>{pageLabel}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
