import { create } from "zustand";

type Filters = {
  houseId: string | null;
  unitId: string | null;
  month: string | null;
  setFilter: (key: keyof Filters, value: string | null) => void;
};

export const useTransactionsFilters = create<Filters>((set) => ({
  houseId: null,
  unitId: null,
  month: null,
  setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
