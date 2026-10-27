"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { SkeletonPage } from "@/components/skeleton/page";
import PlaceLink from "@/components/PlaceLink";
import { initials, tintFor } from "@/app/transactions/TransactionsTable";

type PastTenant = {
  id: string;
  houseId: string;
  unitId: string;
  tenantName: string;
  houseName: string;
  unitNumber: string;
  moveOutDate: string;
  moveOutMonth: string;
  /** Null where the user may not see this house's money. */
  deposit: number | null;
  balance: number | null;
  status: "Owes" | "In credit" | "Settled" | null;
};

const statusOf = (balance: number | null): PastTenant["status"] =>
  balance === null ? null : balance > 0 ? "Owes" : balance < 0 ? "In credit" : "Settled";

const tone: Record<NonNullable<PastTenant["status"]>, string> = {
  Owes: "bg-red-50 text-red-700 ring-red-600/20",
  "In credit": "bg-sky-50 text-sky-700 ring-sky-600/20",
  Settled: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

function BalanceBadge({ item }: { item: PastTenant }) {
  if (item.status === null || item.balance === null) return null;
  return (
    <Badge className={`border-0 ring-1 ring-inset ${tone[item.status]}`}>
      {item.status}
      {item.balance !== 0 && ` KES ${Math.abs(item.balance).toLocaleString()}`}
    </Badge>
  );
}

/** Everyone who has left, newest move-out first under month headings. */
export default function PastTenantsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PastTenant[] | null>(null);

  useEffect(() => {
    fetch("/api/tenant/past")
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data: any[]) =>
        setRows(data.map((t) => ({ ...t, id: t.leaseId, status: statusOf(t.balance) })))
      )
      .catch(() => {
        toast.error("Failed to load past tenants.");
        setRows([]);
      });
  }, []);

  if (!rows) return <SkeletonPage variant="statement" columns={6} />;

  const houses = [...new Set(rows.map((r) => r.houseName))].sort();
  const filters: DataTableProps<PastTenant>["filters"] = [
    {
      key: "houseName",
      label: "Filter by Property",
      options: [{ value: "all", label: "All Properties" }, ...houses.map((h) => ({ value: h, label: h }))],
    },
    {
      key: "status",
      label: "Filter by Status",
      options: [
        { value: "all", label: "All" },
        { value: "Owes", label: "Owes" },
        { value: "In credit", label: "In credit" },
        { value: "Settled", label: "Settled" },
      ],
    },
  ];

  const columns: DataTableProps<PastTenant>["columns"] = [
    { key: "tenantName", label: "Tenant" },
    { key: "houseName", label: "Property", render: (value: string, t) => <PlaceLink href={`/properties/${t.houseId}`}>{value}</PlaceLink> },
    { key: "unitNumber", label: "Unit", render: (value: string, t) => <PlaceLink href={`/properties/${t.houseId}/units/${t.unitId}`}>{value}</PlaceLink> },
    { key: "moveOutDate", label: "Moved out" },
    { key: "deposit", label: "Deposit", render: (value: number | null) => (value === null ? "-" : `KES ${value.toLocaleString()}`) },
    { key: "balance", label: "Balance", render: (_: number, item) => <BalanceBadge item={item} /> },
  ];

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Past Tenants</h1>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search name, property, unit..."
        exportFilename="past-tenants"
        caption="Tenants who have moved out"
        emptyLabel="No past tenants found"
        mobileGroupBy={{ key: "moveOutMonth", label: (value: string) => value }}
        groupWide
        onRowClick={(t) => router.push(`/properties/${t.houseId}/units/${t.unitId}/past/${t.id}`)}
        renderMobileRow={(t) => (
          <div className="flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tintFor(t.tenantName)}`}>
              {initials(t.tenantName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[15px] font-semibold">{t.tenantName}</p>
                <BalanceBadge item={t} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t.unitNumber} · {t.houseName} · left {t.moveOutDate}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
