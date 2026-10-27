"use client"

import { useAccess } from "@/components/AccessProvider";
import { Button } from "@/components/ui/button";
import HousesList from "./housesList";
import { useState } from "react";
import { AddPropertyWizard } from "@/components/forms/add-property-wizard";
import { Plus } from "lucide-react";

export default function PropertiesPage() {
  const [showAddProperty, setShowAddProperty] = useState(false);
  const { can } = useAccess();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Properties</h2>
        {can("property.add") && <Button
          onClick={() => setShowAddProperty(true)}
          className="ml-auto shrink-0 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer shadow-sm shadow-purple-600/20"
        >
          <Plus strokeWidth={3} />
          Add Property
        </Button>}
        {showAddProperty && (
          <AddPropertyWizard onClose={() => setShowAddProperty(false)} />
        )}
      </div>

      <div>
        <HousesList />
      </div>
    </div>
  );
}
