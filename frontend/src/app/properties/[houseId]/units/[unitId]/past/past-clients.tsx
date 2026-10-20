"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { SkeletonPastTenants } from "@/components/skeleton/page";
import { useParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  unitId: string;
}

interface PastTenant {
  tenantName: string;
  moveInDate: string;
  moveOutDate: string;
  leaseId: string; // Added leaseId to the interface
}

export default function PastClients({ unitId }: Props) {
  const [pastTenants, setPastTenants] = useState<PastTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const houseId = params.houseId as string;

  const fetchPastTenants = () => {
    setLoading(true);
    fetch(`/api/tenant/past/${unitId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!Array.isArray(json)) {
          toast.error("Invalid past tenants data returned from server.");
          setPastTenants([]);
          return;
        }
        setPastTenants(json);
      })
      .catch((error) => {
        toast.error("Failed to fetch past tenants.");
        console.error(error);
        setPastTenants([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (unitId) {
      fetchPastTenants();
    }
  }, [unitId]);

  const handleRowClick = (leaseId: string) => {
    router.push(`/properties/${houseId}/units/${unitId}/past/${leaseId}`);
  };

  if (loading) {
    return (
      <SkeletonPastTenants />
    );
  }

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">Past Tenants</h1>

      {pastTenants.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No past tenants found for this unit.
          <p className="mt-4">
            <Button
              variant="default"
              className="text-sm min-w-[150px] cursor-pointer"
              onClick={() => {
                router.push(`/properties/${houseId}/units`);
              }}
            >
              Back to Units Listing
            </Button>
          </p>
        </div>
      ) : (
        <>
        <ul className="space-y-2.5 md:hidden">
          {pastTenants.map((tenant, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => handleRowClick(tenant.leaseId)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-xs transition-colors active:bg-muted/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{tenant.tenantName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                    {tenant.moveInDate} to {tenant.moveOutDate}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tenant Name</TableHead>
                <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move-in Date</TableHead>
                <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Move-out Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastTenants.map((tenant, index) => (
                <TableRow
                  key={index}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleRowClick(tenant.leaseId)}
                >
                  <TableCell className="px-4 py-3 font-medium">
                    {tenant.tenantName}
                  </TableCell>
                  <TableCell className="px-4 py-3">{tenant.moveInDate}</TableCell>
                  <TableCell className="px-4 py-3">{tenant.moveOutDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </div>
  );
}
