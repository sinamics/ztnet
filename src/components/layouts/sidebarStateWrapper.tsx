// components/layouts/SidebarStateWrapper.tsx
"use client";

import { useSidebarStore } from "~/utils/store";

export default function SidebarStateWrapper({ children }: { children: React.ReactNode }) {
	const { open } = useSidebarStore();

	// Use template literals for consistent class interpolation
	const sidebarClasses = `duration-150 ${open ? "w-64" : "w-0 opacity-0"}`;

	return <aside className={sidebarClasses}>{children}</aside>;
}
