import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Spinner } from "./ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { PageHeader } from "./page-header";
import { cn } from "../lib/utils";

type LoadableState<T> =
  | { state: "loading" }
  | { state: "loaded"; data: T[] }
  | { state: "error"; message: string };

type SortDirection = "asc" | "desc";
const MINIMUM_LOADING_MS = 300;

export type ListPageColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue: (row: T) => string | number;
  searchValue?: (row: T) => string;
  className?: string;
};

export type ListPageFilter<T> = {
  label: string;
  placeholder: string;
  allLabel: string;
  options: Array<{ label: string; value: string }>;
  getValue: (row: T) => string;
};

export function ListPage<T extends { id: string }>({
  title,
  recordLabel,
  columns,
  loadData,
  filter,
  emptyMessage,
  onAddRecord,
  onRowClick
}: {
  title: string;
  recordLabel: string;
  columns: ListPageColumn<T>[];
  loadData: () => Promise<T[]>;
  filter?: ListPageFilter<T>;
  emptyMessage: string;
  onAddRecord?: () => void;
  onRowClick?: (row: T) => void;
}) {
  const [dataState, setDataState] = useState<LoadableState<T>>({ state: "loading" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState(columns[0]?.id ?? "id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  async function loadRecords() {
    const [records] = await Promise.all([loadData(), new Promise((resolve) => window.setTimeout(resolve, MINIMUM_LOADING_MS))]);
    return records;
  }

  useEffect(() => {
    let active = true;

    async function runLoad() {
      setDataState({ state: "loading" });

      try {
        const records = await loadRecords();

        if (!active) {
          return;
        }

        setDataState({ state: "loaded", data: records });
      } catch (error) {
        if (!active) {
          return;
        }

        setDataState({
          state: "error",
          message: error instanceof Error ? error.message : "Failed to load records."
        });
      }
    }

    void runLoad();

    return () => {
      active = false;
    };
  }, [loadData]);

  const visibleRows = useMemo(() => {
    if (dataState.state !== "loaded") {
      return [];
    }

    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    const activeColumn = columns.find((column) => column.id === sortColumn) ?? columns[0];

    return [...dataState.data]
      .filter((row) => {
        if (!filter || selectedFilter === "all") {
          return true;
        }

        return filter.getValue(row) === selectedFilter;
      })
      .filter((row) => {
        if (!normalizedQuery) {
          return true;
        }

        return columns.some((column) => {
          const searchValue = column.searchValue?.(row) ?? String(column.sortValue(row));
          return searchValue.toLowerCase().includes(normalizedQuery);
        });
      })
      .sort((left, right) => {
        const leftValue = activeColumn?.sortValue(left);
        const rightValue = activeColumn?.sortValue(right);

        if (leftValue === undefined || rightValue === undefined) {
          return 0;
        }

        if (leftValue === rightValue) {
          return 0;
        }

        const result = leftValue > rightValue ? 1 : -1;
        return sortDirection === "asc" ? result : -result;
      });
  }, [columns, dataState, deferredSearchQuery, filter, selectedFilter, sortColumn, sortDirection]);

  function toggleSort(columnId: string) {
    startTransition(() => {
      if (sortColumn === columnId) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortColumn(columnId);
      setSortDirection("asc");
    });
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

  async function retryLoad() {
    setDataState({ state: "loading" });

    try {
      const records = await loadRecords();
      setDataState({ state: "loaded", data: records });
    } catch (error) {
      setDataState({
        state: "error",
        message: error instanceof Error ? error.message : "Failed to load records."
      });
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title={title} breadcrumbs={["Start", title]} />

      <div className="m-3 flex flex-col gap-2.5 pt-6">
          <div>
            <Button onClick={onAddRecord ?? handleDefaultAddRecord}>
              <Plus className="h-4 w-4" />
              Add {recordLabel}
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => setSearchQuery(value));
                }}
                placeholder={`Search ${recordLabel.toLowerCase()}s...`}
                className="pl-10"
              />
            </div>

            {filter ? (
              <div className="md:ml-auto md:w-64 md:shrink-0">
                <Select
                  value={selectedFilter}
                  onValueChange={(value) => {
                    startTransition(() => setSelectedFilter(value));
                  }}
                >
                  <SelectTrigger aria-label={filter.label}>
                    <SelectValue placeholder={filter.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{filter.allLabel}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
      </div>

      <section className="relative overflow-hidden bg-background" style={{ backgroundImage: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.04), transparent 60%)" }}>
        <div>
          {dataState.state === "loading" ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableHead key={column.id} className={cn("border-b-2 border-b-primary/15 border-t-2 border-t-primary/15 bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground", column.className)}>
                      {column.header}
                    </TableHead>
                  ))}
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
                </TableRow>
              </TableBody>
            </Table>
          ) : dataState.state === "error" ? (
            <div className="mx-6 mb-6 flex flex-col gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{dataState.message}</p>
              <div>
                <Button onClick={() => void retryLoad()}>
                  <Spinner className="text-primary-foreground" />
                  Retry
                </Button>
              </div>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="mx-6 mb-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableHead key={column.id} className={cn("border-b-2 border-b-primary/15 border-t-2 border-t-primary/15 bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground", column.className)}>
                      <button className="group/sort inline-flex items-center gap-2 font-semibold" type="button" onClick={() => toggleSort(column.id)}>
                        {column.header}
                        {sortColumn === column.id ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-l-2 border-l-transparent transition-colors duration-150 hover:border-l-primary hover:bg-accent/40",
                      rowIndex % 2 === 1 && "bg-muted/10"
                    )}
                    onClick={() => (onRowClick ? onRowClick(row) : handleDefaultRowClick())}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
