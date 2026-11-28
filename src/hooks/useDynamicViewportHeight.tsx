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
		// The header changes height after the font size class is applied or when it wraps.
		const observer = new ResizeObserver(updateViewportHeight);
		if (headerRef.current) observer.observe(headerRef.current);
		return () => {
			window.removeEventListener("resize", updateViewportHeight);
			observer.disconnect();
		};
	}, [updateViewportHeight, ...dependencies]);

	return headerRef;
};

export default useDynamicViewportHeight;
