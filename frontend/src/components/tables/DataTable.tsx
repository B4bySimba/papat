"use client";
import type React from "react";
import { useState, useCallback } from "react";
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
} from "lucide-react";
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
};

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
  onEditClick
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
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  const filteredData = data.filter((item) => {
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

  const filteredAndSortedData = filteredData.sort((a, b) => {
    if (!sortField) return 0;
    let aValue = a[sortField];
    let bValue = b[sortField];

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

  const paginatedData = filteredAndSortedData.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize
  );

  const handleDelete = useCallback(
    (id: string) => {
      onDelete(id);
    },
    [onDelete]
  );
    
  const handleExportCSV = () => {
    const header = columns.map((col) => col.label);
    const rows = filteredAndSortedData.map((item) =>
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

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          {filters.map((filter) => (
            <FilterCombobox
              key={filter.key as string}
              value={filterValues[filter.key as string]}
              onChange={(value) =>
                setFilterValues((prev) => ({
                  ...prev,
                  [filter.key as string]: value,
                }))
              }
              placeholder={filter.label}
              options={filter.options}
            />
          ))}
        </div>
        <Button
          className="ml-auto bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer"
          variant="outline"
          onClick={handleExportCSV}
        >
          <DownloadIcon className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableCaption>{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key as string}
                  className={
                    column.sortable !== false
                      ? "cursor-pointer hover:bg-muted/50 select-none"
                      : ""
                  }
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
              <TableHead className="text-right w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted" : ""}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key as string}>
                      {column.render
                        ? column.render(item[column.key], item)
                        : String(item[column.key])}
                    </TableCell>
                  ))}
                  <TableCell
                    className="text-right w-12"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyLabel ?? "No data found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={columns.length + 1}>
                <div className="flex items-center justify-between">
                  <span>
                    Showing {pageIndex * pageSize + 1}-
                    {Math.min(
                      (pageIndex + 1) * pageSize,
                      filteredAndSortedData.length
                    )}{" "}
                    of {filteredAndSortedData.length} items
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPageIndex(0);
                      }}
                    >
                      <SelectTrigger className="w-fit h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>per page</span>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageIndex(0)}
                      disabled={pageIndex === 0}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageIndex((p) => p - 1)}
                      disabled={pageIndex === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageIndex((p) => p + 1)}
                      disabled={
                        (pageIndex + 1) * pageSize >=
                        filteredAndSortedData.length
                      }
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPageIndex(
                          Math.ceil(filteredAndSortedData.length / pageSize) - 1
                        )
                      }
                      disabled={
                        (pageIndex + 1) * pageSize >=
                        filteredAndSortedData.length
                      }
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
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
