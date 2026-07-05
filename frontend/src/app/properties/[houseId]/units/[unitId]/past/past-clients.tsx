"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Past Tenants</h1>
        <div className="text-center py-4">Loading past tenants...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Past Tenants</h1>

      {pastTenants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Tenant Name</TableHead>
                <TableHead className="font-semibold">Move-in Date</TableHead>
                <TableHead className="font-semibold">Move-out Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastTenants.map((tenant, index) => (
                <TableRow
                  key={index}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleRowClick(tenant.leaseId)}
                >
                  <TableCell className="font-medium">
                    {tenant.tenantName}
                  </TableCell>
                  <TableCell>{tenant.moveInDate}</TableCell>
                  <TableCell>{tenant.moveOutDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
