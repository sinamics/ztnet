import { create } from "zustand";

interface StoreI {
  open: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<StoreI>((set) => ({
  open: false,
  toggle: () => set((state) => ({ open: !state.open })),
}));
