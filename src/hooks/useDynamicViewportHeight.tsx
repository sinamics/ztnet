import { useEffect, useCallback, useRef } from "react";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const useDynamicViewportHeight = (dependencies: any[] = []) => {
	const headerRef = useRef<HTMLDivElement>(null);

	const updateViewportHeight = useCallback(() => {
		if (!headerRef.current) return;
		const headerHeight = headerRef.current.offsetHeight;
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty("--vh", `${vh}px`);
		document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
	}, []);

	useEffect(() => {
		updateViewportHeight();
		window.addEventListener("resize", updateViewportHeight);
		return () => window.removeEventListener("resize", updateViewportHeight);
	}, [updateViewportHeight, ...dependencies]);

	return headerRef;
};

export default useDynamicViewportHeight;
