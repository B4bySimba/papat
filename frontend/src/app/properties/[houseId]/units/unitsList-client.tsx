"use client";
import { useState, useEffect, useCallback } from "react";
import { SkeletonPage } from "@/components/skeleton/page";
import { UnitsList } from "@/lib/unitsSchema";
import { UnitsTable } from "./UnitsTable";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddUnitSlideout } from "@/components/forms/add-unit-slideout";
import { toast } from "sonner";


export default function UnitsListPage() {
  const router = useRouter();
const { houseId } = useParams();
  const [units, setUnits] = useState<UnitsList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchUnits = async () => {
    try {
      const response = await fetch(`/api/units/byHouseId?houseId=${houseId}`);
      const data = await response.json();
      setUnits(data);
    } catch (error) {
      console.error("Error fetching units:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (houseId) fetchUnits();
  }, [houseId]);
    
  const handleDelete = async (id: string) => {
    const unit = units.find((u) => u.unitId === id);

    // Block deletion if the unit is occupied
    if (unit?.state) {
      toast.error("You cannot delete an occupied unit.");
      return;
    }

    try {
      console.log("�️ API CALL: Deleting unit", id);
      const res = await fetch("/api/units/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Delete failed");

      setUnits((prev) => prev.filter((tx) => tx.unitId !== id));
      toast.success("Unit deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete unit.");
    }
  };
      
  const handleEditSubmit = (updated: UnitsList) => {
    console.log("Edited transaction:", updated);
  };

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-bold">Units</h1>
        <Button
          onClick={() => setShowAddForm(true)}
          className="ml-auto bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer"
        >
          <Plus strokeWidth={3} />
          Add Unit
        </Button>
      </div>
      <UnitsTable
        data={units
          .map((u) => ({ ...u, id: u.unitId }))
          .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber))}
        onDelete={handleDelete}
        onSubmitEdit={handleEditSubmit}
        refreshData={fetchUnits}
      />
      {showAddForm && (
        <AddUnitSlideout
          defaultHouseId={houseId as string}
          onClose={() => setShowAddForm(false)}
          onSuccess={async () => {
            await fetchUnits();
          }}
        />
      )}
    </div>
  );
}
