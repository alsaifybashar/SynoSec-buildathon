import type { ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DetailRelationColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DetailRelationSection<T>({
  title,
  description,
  items,
  columns,
  emptyMessage,
  getRowId,
  onAdd,
  onEdit,
  onDelete
}: {
  title: string;
  description?: string;
  items: T[];
  columns: DetailRelationColumn<T>[];
  emptyMessage: string;
  getRowId: (row: T) => string;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}) {
  const hasRowActions = Boolean(onEdit || onDelete);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base md:text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>

        {onAdd ? (
          <Button type="button" className="h-9 self-start text-[0.75rem]" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {items.map((row) => (
                <Card key={getRowId(row)} className="border-border/70 bg-background/60 shadow-none">
                  <CardContent className="space-y-4 px-4 py-4">
                    {columns.map((column) => (
                      <div key={column.id} className="space-y-1.5">
                        <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {column.header}
                        </p>
                        <div className={cn("text-sm text-foreground", column.className)}>
                          {column.cell(row)}
                        </div>
                      </div>
                    ))}

                    {hasRowActions ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {onEdit ? (
                          <Button type="button" variant="outline" className="h-8 text-[0.75rem]" onClick={() => onEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        ) : null}
                        {onDelete ? (
                          <Button type="button" variant="outline" className="h-8 text-[0.75rem]" onClick={() => onDelete(row)}>
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        ) : null}
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
                      <TableHead
                        key={column.id}
                        className={cn("border-b border-b-primary/10 border-t border-t-primary/10 bg-muted/60 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground", column.className)}
                      >
                        {column.header}
                      </TableHead>
                    ))}
                    {hasRowActions ? (
                      <TableHead className="border-b border-b-primary/10 border-t border-t-primary/10 bg-muted/60 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Actions
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, rowIndex) => (
                    <TableRow
                      key={getRowId(row)}
                      className={cn("transition-colors duration-150 hover:bg-accent/30", rowIndex % 2 === 1 && "bg-muted/10")}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.id} className={cn("text-[0.75rem]", column.className)}>
                          {column.cell(row)}
                        </TableCell>
                      ))}
                      {hasRowActions ? (
                        <TableCell className="text-[0.75rem]">
                          <div className="flex flex-wrap gap-2">
                            {onEdit ? (
                              <Button type="button" variant="outline" className="h-8 text-[0.75rem]" onClick={() => onEdit(row)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            ) : null}
                            {onDelete ? (
                              <Button type="button" variant="outline" className="h-8 text-[0.75rem]" onClick={() => onDelete(row)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
