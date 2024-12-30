import { useEffect } from "react";
import { useSidebarStore } from "~/store/sidebarStore";
import useStore from "~/store/useStore";

// Create a custom hook
export const useHandleResize = () => {
	const setOpenState = useStore(useSidebarStore, (state) => state.setOpenState);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768) return setOpenState?.(true);

			setOpenState?.(false);
		};

		// Initial check
		handleResize();

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);
};
