"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import SkeletonTable from "../skeleton/table";

interface DataCardTableProps<TData> {
  title?: string;
  description?: string;
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;
  buttonLabel?: string;
  onButtonClick?: () => void;
  viewAllLabel?: string;
  viewAllHref?: string;
  emptyLabel?: string;
}

export function DataCardTable<TData>({
  title = "Data Table",
  description,
  data,
  columns,
  loading = false,
  buttonLabel,
  onButtonClick,
  viewAllLabel,
  viewAllHref,
  emptyLabel,
}: DataCardTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <Card className="@container/mini gap-4 overflow-hidden py-5 sm:gap-6 sm:py-6">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col gap-3 @lg/mini:flex-row @lg/mini:items-start @lg/mini:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex shrink-0 gap-2">
            {buttonLabel && onButtonClick && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onButtonClick}
                className="flex-1 @lg/mini:flex-none bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer"
              >
                {buttonLabel}
              </Button>
            )}
            {viewAllHref && (
              <Link href={viewAllHref} className="flex-1 @lg/mini:flex-none">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 cursor-pointer"
                >
                  {viewAllLabel ?? "View All"}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 sm:px-6">
        {loading ? (
          <SkeletonTable />
        ) : (
          <>
            {/* Phones: compact list */}
            <ul className="divide-y rounded-xl border @md/mini:hidden">
              {rows.length ? (
                rows.map((row) => {
                  const cells = row.getVisibleCells();
                  return (
                    <li key={row.id} className="flex items-center gap-3 px-3 py-3 text-sm">
                      {cells.map((cell, i) => (
                        <div
                          key={cell.id}
                          className={
                            i === 0
                              ? "shrink-0"
                              : i === cells.length - 1
                              ? "shrink-0 tabular-nums"
                              : "min-w-0 flex-1 truncate font-medium"
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </li>
                  );
                })
              ) : (
                <li className="py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel ?? "No results."}
                </li>
              )}
            </ul>

            <div className="hidden overflow-hidden rounded-xl border @md/mini:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground data-[name=actions]:w-10 data-[name=amount]:w-24 data-[name=select]:w-10 data-[name=status]:w-24 [&:has([role=checkbox])]:pl-3"
                          data-name={header.id}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="px-3 py-2.5 data-[name=actions]:w-10 data-[name=amount]:w-24 data-[name=select]:w-10 data-[name=status]:w-24 [&:has([role=checkbox])]:pl-3"
                            data-name={cell.column.id}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {emptyLabel ?? "No results."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2">
          <div className="text-muted-foreground hidden flex-1 text-sm @md/mini:block">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
