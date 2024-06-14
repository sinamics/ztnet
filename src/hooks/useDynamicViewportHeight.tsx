import { useEffect, useCallback, useRef } from "react";

const useDynamicViewportHeight = () => {
	const headerRef = useRef<HTMLDivElement>(null);

	const updateVhAndHeaderHeight = useCallback(() => {
		const headerHeight = headerRef.current ? headerRef.current.offsetHeight : 48;
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty("--vh", `${vh}px`);
		document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
	}, []);

	useEffect(() => {
		updateVhAndHeaderHeight();
		window.addEventListener("resize", updateVhAndHeaderHeight);
		return () => window.removeEventListener("resize", updateVhAndHeaderHeight);
	}, [updateVhAndHeaderHeight]);

	return headerRef;
};

export default useDynamicViewportHeight;
