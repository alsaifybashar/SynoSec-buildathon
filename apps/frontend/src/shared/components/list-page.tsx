import { useId, useRef, useState, type ChangeEvent, isValidElement, startTransition, type MouseEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Check, ChevronsLeft, ChevronsRight, Download, FileUp, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
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

export type ListPageFilter = {
  id: string;
  label: string;
  placeholder: string;
  allLabel: string;
  options: Array<{ label: string; value: string }>;
};

const CLEAR_FILTER_VALUE = "__all__";

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

export function ListPage<T extends { id: string }>({
  title,
  recordLabel,
  columns,
  query,
  dataState,
  items,
  meta,
  filters = [],
  emptyMessage,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onAddRecord,
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
  emptyMessage: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string | undefined) => void;
  onSortChange: (columnId: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  onAddRecord?: () => void;
  onRowClick?: (row: T) => void;
  onImportJson?: (file: File) => void | Promise<void>;
  getRowLabel?: (row: T) => string;
  onExportRowJson?: (row: T) => void;
  onDeleteRow?: (row: T) => void | Promise<void>;
  canExportRow?: (row: T) => boolean;
  canDeleteRow?: (row: T) => boolean;
}) {
  const importInputId = useId();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const showRowActions = Boolean(onExportRowJson || onDeleteRow);

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

  function renderRowActions(row: T) {
    const rowLabel = getRowLabel?.(row) ?? row.id;
    const canExport = onExportRowJson ? (canExportRow?.(row) ?? true) : false;
    const canDelete = onDeleteRow ? (canDeleteRow?.(row) ?? true) : false;
    const confirmingDelete = confirmDeleteId === row.id;
    const deleting = deletingId === row.id;

    if (confirmingDelete && canDelete && onDeleteRow) {
      return (
        <div className="flex min-w-[16rem] flex-col items-end gap-2 text-right">
          <div className="inline-flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-left">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <div className="space-y-0.5">
              <p className="text-[0.7rem] font-medium text-foreground">Delete {rowLabel}?</p>
              <p className="text-[0.68rem] leading-5 text-muted-foreground">This action cannot be undone.</p>
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
              stopRowClick(event);
              onExportRowJson(row);
            }}
          >
            <Download className="h-3.5 w-3.5" />
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

  const pageLabel = meta.total === 0
    ? "0 results"
    : `${(meta.page - 1) * meta.pageSize + 1}-${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}`;
  const visiblePageNumbers = meta.totalPages === 0
    ? []
    : [meta.page, meta.page + 1, meta.page + 2].filter((page, index, values) => page <= meta.totalPages && values.indexOf(page) === index);
  return (
    <div className="space-y-3 pb-6">
      <PageHeader title={title} breadcrumbs={["Start", title]} />

      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex flex-col gap-2.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            <Button onClick={onAddRecord ?? handleDefaultAddRecord} className="h-9 text-sm">
              <Plus className="h-4 w-4" />
              Add {recordLabel}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {onImportJson ? (
                <>
                  <input
                    id={importInputId}
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={handleImportChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title="Import JSON"
                    aria-label="Import JSON"
                    onClick={() => importInputRef.current?.click()}
                  >
                    <FileUp className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Export CSV"
                aria-label="Export CSV"
                onClick={handleExportExcel}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1 md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query.q ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => onSearchChange(value));
                }}
                placeholder={`search ${recordLabel.toLowerCase()}s`}
                className="h-9 pl-9 font-mono text-[0.75rem] placeholder:normal-case placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="flex flex-col gap-2 md:ml-auto md:flex-row">
              {filters.map((filter) => (
                <div key={filter.id} className="md:w-[9.375rem] md:shrink-0">
                  {(() => {
                    const selectedValue = typeof query[filter.id] === "string"
                      ? String(query[filter.id])
                      : CLEAR_FILTER_VALUE;

                    return (
                      <Select
                        value={selectedValue}
                        onValueChange={(value) => {
                          startTransition(() => onFilterChange(filter.id, value === CLEAR_FILTER_VALUE ? undefined : value));
                        }}
                      >
                        <SelectTrigger aria-label={filter.label} className="h-9 text-[0.75rem]">
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
                    );
                  })()}
                </div>
              ))}
            </div>
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
                      {columns.map((column) => (
                        <TableHead key={column.id} className={cn("border-b border-b-border border-t border-t-border bg-muted/40 font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em] text-muted-foreground", column.className)}>
                          {column.header}
                        </TableHead>
                      ))}
                      {showRowActions ? (
                        <TableHead className="border-b border-b-border border-t border-t-border bg-muted/40 text-right font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          Actions
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent">
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
                {items.map((row) => (
                  <Card
                    key={row.id}
                    className="cursor-pointer border-border/70 transition-colors duration-150 hover:border-primary/30 hover:bg-accent/20"
                    onClick={() => (onRowClick ? onRowClick(row) : handleDefaultRowClick())}
                  >
                    <CardContent className="space-y-4 px-4 py-4">
                      {columns.map((column) => (
                        <div key={column.id} className="space-y-1.5">
                          <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {column.header}
                          </p>
                          <div className="text-sm text-foreground">
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
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {columns.map((column) => (
                        <TableHead key={column.id} className={cn("border-b border-b-border border-t border-t-border bg-muted/40 font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em] text-muted-foreground", column.className)}>
                          {column.sortable === false ? (
                            column.header
                          ) : (
                            <button className="group/sort inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em]" type="button" onClick={() => onSortChange(column.id)}>
                              {column.header}
                              {query.sortBy === column.id ? (
                                query.sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                            </button>
                          )}
                        </TableHead>
                      ))}
                      {showRowActions ? (
                        <TableHead className="border-b border-b-border border-t border-t-border bg-muted/40 text-right font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          Actions
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "cursor-pointer border-l-2 border-l-transparent transition-colors duration-150 hover:border-l-primary hover:bg-accent/30"
                        )}
                        onClick={() => (onRowClick ? onRowClick(row) : handleDefaultRowClick())}
                      >
                        {columns.map((column) => (
                          <TableCell key={column.id} className={cn("text-[0.75rem]", column.className)}>
                            {column.cell(row)}
                          </TableCell>
                        ))}
                        {showRowActions ? (
                          <TableCell className="w-[1%] min-w-[13rem] align-top text-[0.75rem]">
                            <div onClick={stopRowClick}>
                              {renderRowActions(row)}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 border-t border-border/70 px-4 py-4 text-[0.75rem] text-muted-foreground md:px-6 md:grid-cols-3 md:items-center">
                <div className="flex flex-wrap items-center justify-start gap-3">
                  <div className="w-full shrink-0 md:w-[9.375rem]">
                    <Select
                      value={String(query.pageSize)}
                      onValueChange={(value) => {
                        startTransition(() => onPageSizeChange(Number(value)));
                      }}
                    >
                      <SelectTrigger aria-label="Page size" className="h-9 text-[0.75rem]">
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
