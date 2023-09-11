import { useLayoutEffect } from "react";
import { useSidebarStore } from "~/utils/store";

// Create a custom hook
export const useHandleResize = () => {
	const { setOpenState } = useSidebarStore();

	useLayoutEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768) return setOpenState(true);

			setOpenState(false);
		};

		// Initial check
		handleResize();

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);
};
