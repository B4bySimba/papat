"use client";
import type React from "react";
import { useState, useCallback, useEffect } from "react";
import type { ServerTable } from "@/hooks/use-server-table";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  Edit,
  AlertTriangle,
  MoreHorizontal,
  Search,
  Inbox,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterCombobox } from "@/components/ui/filter-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RowSheet } from "./rowSheet";

export type DataTableProps<T> = {
  data: T[];
  onDelete: (id: string) => void;
  onRowClick?: (item: T) => void;
  columns: {
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (value: any, item: T) => React.ReactNode;
  }[];
  filters?: {
    key: keyof T;
    label: string;
    options: { value: string; label: string }[];
  }[];
  searchPlaceholder?: string;
  exportFilename?: string;
  caption?: string;
  emptyLabel?: string;

  renderRowDetail?: (item: T) => React.ReactNode;
  detailSheetTitle?: string;
  onEditClick?: (item: T) => void;
  /** Which columns lead each card on phones; the rest fill the card's grid unless `details` is false. */
  mobileCard?: { title: keyof T; subtitle?: keyof T; value?: keyof T; details?: boolean };
  /** Phones: draw each row as a slim list item instead of a card. */
  renderMobileRow?: (item: T, context: { grouped: boolean }) => React.ReactNode;
  /** Phones: head runs of rows sharing this column, while the list is in its default order or sorted by it. */
  mobileGroupBy?: { key: keyof T; label: (value: any) => React.ReactNode };
  /** `data` is one page from the server; search, filters, sort and paging go to it instead of running here. */
  server?: ServerTable<T>;
};

const dmyToIso = (v: any) =>
  typeof v === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(v) ? v.split("/").reverse().join("-") : v;

export function DataTable<T extends { id: string }>({
  data,
  onDelete,
  onRowClick,
  columns,
  filters = [],
  searchPlaceholder = "Search...",
  exportFilename = "data",
  caption = "Data table",
  emptyLabel = "No Data found",
  renderRowDetail,
  detailSheetTitle = "Details",
  onEditClick,
  mobileCard,
  renderMobileRow,
  mobileGroupBy,
  server,
}: DataTableProps<T>) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    filters.reduce(
      (acc, filter) => ({ ...acc, [filter.key as string]: "all" }),
      {}
    )
  );
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isServer = !!server;
  const onQueryChange = server?.onQueryChange;

  useEffect(() => {
    if (!isServer || search === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [isServer, search, debouncedSearch]);

  useEffect(() => {
    onQueryChange?.({
      page: pageIndex,
      pageSize,
      search: debouncedSearch,
      filters: filterValues,
      sort: sortField as string | null,
      dir: sortDirection,
    });
  }, [onQueryChange, pageIndex, pageSize, debouncedSearch, filterValues, sortField, sortDirection]);

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPageIndex(0);
  };

  const getSortIcon = (field: keyof T) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary" />
    );
  };

  const filteredData = server ? data : data.filter((item) => {
    // Search filter
    const matchesSearch = search
      ? Object.values(item).some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      : true;

    // Custom filters
    const matchesFilters = filters.every((filter) => {
      const filterValue = filterValues[filter.key as string];
      if (filterValue === "all") return true;
      return item[filter.key] === filterValue;
    });

    return matchesSearch && matchesFilters;
  });

  const filteredAndSortedData = server ? filteredData : filteredData.sort((a, b) => {
    if (!sortField) return 0;
    let aValue = dmyToIso(a[sortField]);
    let bValue = dmyToIso(b[sortField]);

    // Handle null values
    if (aValue === null) aValue = "" as any;
    if (bValue === null) bValue = "" as any;

    // Handle dates
    if (typeof aValue === "string" && !isNaN(Date.parse(aValue))) {
      aValue = new Date(aValue).getTime() as any;
      bValue = new Date(bValue as string).getTime() as any;
    } else if (typeof aValue === "number") {
      aValue = Number(aValue) as any;
      bValue = Number(bValue) as any;
    } else if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase() as any;
      bValue = bValue.toLowerCase() as any;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedData = server ? data : filteredAndSortedData.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize
  );

  const handleDelete = useCallback(
    (id: string) => {
      onDelete(id);
    },
    [onDelete]
  );
    
  const handleExportCSV = async () => {
    let exportData = filteredAndSortedData;
    if (server) {
      try {
        exportData = await server.fetchAll();
      } catch (error) {
        console.error("Error exporting CSV:", error);
        toast.error("Failed to export CSV.");
        return;
      }
    }
    const header = columns.map((col) => col.label);
    const rows = exportData.map((item) =>
      columns.map((col) => {
        const value = item[col.key];
        return typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      })
    );
    const csvContent = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${exportFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  const total = server ? server.total : filteredAndSortedData.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const onLastPage = (pageIndex + 1) * pageSize >= total;

  if (isServer && pageIndex >= pageCount) setPageIndex(pageCount - 1);
  const sortableColumns = columns.filter((column) => column.sortable !== false);
  const card = mobileCard ?? { title: columns[0]?.key };
  const cardColumns =
    mobileCard?.details === false
      ? []
      : columns.filter((column) => ![card.title, card.subtitle, card.value].includes(column.key));

  const grouped = !!mobileGroupBy && (!sortField || sortField === mobileGroupBy.key);
  const mobileGroups = paginatedData.reduce<{ key: string; items: T[] }[]>((groups, item) => {
    const key = grouped && mobileGroupBy ? String(item[mobileGroupBy.key]) : "";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
    return groups;
  }, []);

  const renderCell = (column: DataTableProps<T>["columns"][number], item: T) =>
    column.render ? column.render(item[column.key], item) : String(item[column.key]);
  const columnFor = (key?: keyof T) => columns.find((column) => column.key === key);

  const renderActions = (item: T) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Row actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            onEditClick?.(item); // trigger sheet-based edit
            setEditingId(item.id); // keep internal ID tracking if needed
          }}
        >
          <Edit className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setPendingDeleteId(item.id)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">{emptyLabel ?? "No data found."}</p>
    </div>
  );

  return (
    <div className="@container/table">
      <div className="mb-4 flex flex-col gap-2 @3xl/table:flex-row @3xl/table:flex-wrap @3xl/table:items-center @3xl/table:gap-3">
        <div className="flex gap-2 @3xl/table:w-full @3xl/table:max-w-sm">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!server) setPageIndex(0);
              }}
              className="h-10 bg-background pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 bg-background cursor-pointer @3xl/table:hidden"
            onClick={handleExportCSV}
            aria-label="Export CSV"
          >
            <DownloadIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none @3xl/table:mx-0 @3xl/table:overflow-visible @3xl/table:p-0">
          {sortableColumns.length > 0 && (
            <div className="flex shrink-0 @3xl/table:hidden">
              <Select
                value={sortField ? String(sortField) : "none"}
                onValueChange={(value) => {
                  setSortField(value === "none" ? null : (value as keyof T));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger className="h-9 w-auto gap-1.5 rounded-l-full rounded-r-none border-r-0 bg-background pl-3 pr-2 text-sm">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default order</SelectItem>
                  {sortableColumns.map((column) => (
                    <SelectItem key={column.key as string} value={column.key as string}>
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-l-none rounded-r-full bg-background"
                disabled={!sortField}
                onClick={() => {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  setPageIndex(0);
                }}
                aria-label={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
              >
                {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {filters.map((filter) => (
            <FilterCombobox
              key={filter.key as string}
              value={filterValues[filter.key as string]}
              onChange={(value) => {
                setFilterValues((prev) => ({
                  ...prev,
                  [filter.key as string]: value,
                }));
                setPageIndex(0);
              }}
              placeholder={filter.label}
              options={filter.options}
              className="h-9 w-auto min-w-[8.5rem] max-w-[13rem] shrink-0 rounded-full @3xl/table:h-10 @3xl/table:w-[180px] @3xl/table:max-w-none @3xl/table:rounded-md"
            />
          ))}
        </div>
        <Button
          className="hidden h-10 shrink-0 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer @3xl/table:ml-auto @3xl/table:inline-flex"
          variant="outline"
          onClick={handleExportCSV}
        >
          <DownloadIcon className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Narrow spaces: a slim list when the page supplies a row, otherwise one card per row */}
      <div className={cn("transition-opacity @3xl/table:hidden", server?.loading && "opacity-60")}>
        {paginatedData.length === 0 ? (
          <div className="rounded-xl border bg-card">{emptyState}</div>
        ) : renderMobileRow ? (
          <div className="space-y-4">
            {mobileGroups.map((group, i) => (
              <section key={`${group.key}-${i}`}>
                {grouped && mobileGroupBy && (
                  <h3 className="sticky top-0 z-10 -mx-1 bg-gray-50/90 px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                    {mobileGroupBy.label(group.items[0][mobileGroupBy.key])}
                  </h3>
                )}
                <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        "flex items-center gap-1 py-3 pl-3.5 pr-1 transition-colors",
                        onRowClick && "cursor-pointer active:bg-muted/60"
                      )}
                    >
                      <div className="min-w-0 flex-1">{renderMobileRow(item, { grouped })}</div>
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {renderActions(item)}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {paginatedData.map((item) => {
              const titleColumn = columnFor(card.title);
              const subtitleColumn = columnFor(card.subtitle);
              const valueColumn = columnFor(card.value);
              return (
                <li
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "rounded-xl border bg-card p-4 shadow-xs transition-colors",
                    onRowClick && "cursor-pointer active:bg-muted/60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      {titleColumn && (
                        <div className="truncate text-[15px] font-semibold leading-snug">
                          {renderCell(titleColumn, item)}
                        </div>
                      )}
                      {subtitleColumn && (
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {renderCell(subtitleColumn, item)}
                        </div>
                      )}
                    </div>
                    {valueColumn && (
                      <div className="shrink-0 pt-0.5 text-right text-[15px] font-semibold tabular-nums">
                        {renderCell(valueColumn, item)}
                      </div>
                    )}
                    <div className="-mr-2 -mt-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {renderActions(item)}
                    </div>
                  </div>
                  {cardColumns.length > 0 && (
                    <dl className={cn("mt-3 grid gap-x-4 gap-y-2.5 border-t pt-3 text-sm", cardColumns.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                      {cardColumns.map((column) => (
                        <div key={column.key as string} className="min-w-0">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {column.label}
                          </dt>
                          <dd className="mt-0.5 font-medium wrap-break-word">{renderCell(column, item)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Wide spaces: the table */}
      <div className={cn("hidden overflow-hidden rounded-xl border bg-card shadow-xs transition-opacity @3xl/table:block", server?.loading && "opacity-60")}>
        <Table>
          <TableCaption className="mb-4">{caption}</TableCaption>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key as string}
                  className={cn(
                    "h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    column.sortable !== false && "cursor-pointer hover:text-foreground select-none"
                  )}
                  onClick={
                    column.sortable !== false
                      ? () => handleSort(column.key)
                      : undefined
                  }
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="h-11 w-12 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/60" : ""}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key as string} className="px-4 py-3">
                      {renderCell(column, item)}
                    </TableCell>
                  ))}
                  <TableCell
                    className="px-4 py-2 text-right w-12"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderActions(item)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 1}>{emptyState}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground @xl/table:flex-row @xl/table:items-center @xl/table:justify-between">
        <span className="tabular-nums">
          Showing {total === 0 ? 0 : pageIndex * pageSize + 1}-
          {Math.min((pageIndex + 1) * pageSize, total)} of {total} items
        </span>
        <div className="flex items-center justify-between gap-3 @xl/table:justify-end @xl/table:gap-5">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-9 w-fit bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden @xl/table:inline">per page</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-9 @xl/table:inline-flex"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => setPageIndex((p) => p - 1)}
              disabled={pageIndex === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4.5rem] px-1 text-center text-xs font-medium tabular-nums text-foreground">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={onLastPage}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-9 @xl/table:inline-flex"
              onClick={() => setPageIndex(Math.ceil(total / pageSize) - 1)}
              disabled={onLastPage}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {pendingDeleteId && (
        <AlertDialog
          open
          onOpenChange={(open) => !open && setPendingDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleDelete(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {editingId && renderRowDetail && (
        <RowSheet
          open={!!editingId}
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
          title={detailSheetTitle}
        >
          {renderRowDetail(data.find((d) => d.id === editingId)!)}
        </RowSheet>
      )}
    </div>
  );
}
