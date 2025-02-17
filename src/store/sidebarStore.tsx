import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StoreI {
	open: boolean;
	hydrated: boolean;
	setHydrated: (val: boolean) => void;
	toggle: () => void;
	setOpenState: (state: boolean) => void;
}

export const useSidebarStore = create(
	persist<StoreI>(
		(set) => ({
			open: false,
			hydrated: false,
			setHydrated: (val) => set({ hydrated: val }),
			toggle: () => set((state) => ({ open: !state.open })),
			setOpenState: (state: boolean) => set(() => ({ open: state })),
		}),
		{
			name: "menu-sidebar",
			// Once zustand rehydrates from localStorage, mark hydrated = true
			onRehydrateStorage: () => (state, error) => {
				if (!error) {
					state?.setHydrated(true);
				}
			},
		},
	),
);
