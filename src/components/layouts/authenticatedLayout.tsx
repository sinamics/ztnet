"use client";

// 1) Make sure this file is a pure client component (e.g., 'use client' at top).
// 2) Remove any SSR-conditional code (e.g., if (typeof window !== 'undefined')).
// 3) Ensure you’re not adding or removing DOM elements based on store state
//    before zustand is hydrated.

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import Footer from "./footer";
import Header from "./header";
import Modal from "../shared/modal";
import { useSidebarStore } from "~/store/sidebarStore";
import useStore from "~/store/useStore";

// Dynamically import Sidebar to avoid SSR mismatch.
const Sidebar = dynamic(() => import("./sidebar"), { ssr: false });

export default function MainLayout({ children }: { children: ReactNode }) {
	const hydrated = useStore(useSidebarStore, (state) => state.hydrated);
	const open = useStore(useSidebarStore, (state) => state.open);

	// While rehydrating from localStorage, render nothing
	// so the server DOM matches the client DOM.
	if (!hydrated) return null;

	return (
		<div className="outer-container">
			<Modal />
			<Header />
			<div className="flex">
				<aside
					className={`duration-150 transition-all ${open ? "w-64" : "w-0 opacity-0"}`}
				>
					<Sidebar />
				</aside>
				<div className="lg:grid lg:grid-rows-[1fr_auto] inner-container w-full custom-scrollbar">
					<div className="flex-grow custom-scrollbar">{children}</div>
					<Footer />
				</div>
			</div>
		</div>
	);
}
