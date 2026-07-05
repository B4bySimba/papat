"use client"

import { Button } from "@/components/ui/button";
import HousesList from "./housesList";
import { useState } from "react";
import { AddPropertyWizard } from "@/components/forms/add-property-wizard";
import { Plus } from "lucide-react";

export default function PropertiesPage() {
  const [showAddProperty, setShowAddProperty] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Properties</h2>
        <Button
          onClick={() => setShowAddProperty(true)}
          className="ml-auto bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer"
        >
          <Plus strokeWidth={3} />
          Add Property
        </Button>
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
