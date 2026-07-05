import { create } from "zustand";
import { UnitsList } from "../unitsSchema";

type UnitStore = {
  selectedUnit: UnitsList | null;
  setSelectedUnit: (unit: UnitsList) => void;
};

export const useSelectedUnit = create<UnitStore>((set) => ({
  selectedUnit: null,
  setSelectedUnit: (unit) => set({ selectedUnit: unit }),
}));
