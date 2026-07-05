import { create } from "zustand";

type UnitData = Record<string, any>;

type SheetState = {
  open: boolean;
  unit: UnitData | null;
  onSubmit?: ((updated: UnitData) => Promise<void>) | undefined;
  openSheet: (
    unit: UnitData,
    onSubmit?: (updated: UnitData) => Promise<void>
  ) => void;
  closeSheet: () => void;
};

export const useUnitEditSheet = create<SheetState>((set) => ({
  open: false,
  unit: null,
  onSubmit: undefined,
  openSheet: (unit, onSubmit) => set({ unit, onSubmit, open: true }),
  closeSheet: () => set({ open: false, unit: null, onSubmit: undefined }),
}));
  