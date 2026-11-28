import { act, render } from "@testing-library/react";
import useDynamicViewportHeight from "~/hooks/useDynamicViewportHeight";

let resizeCallback: () => void;
const observe = jest.fn();
const disconnect = jest.fn();

class MockResizeObserver {
	constructor(callback: () => void) {
		resizeCallback = callback;
	}
	observe = observe;
	disconnect = disconnect;
	unobserve = jest.fn();
}

const Header = () => {
	const headerRef = useDynamicViewportHeight();
	return <div ref={headerRef} data-testid="header" />;
};

const setHeaderHeight = (element: HTMLElement, height: number) => {
	Object.defineProperty(element, "offsetHeight", { configurable: true, value: height });
};

const headerHeightVar = () =>
	document.documentElement.style.getPropertyValue("--header-height");

describe("useDynamicViewportHeight", () => {
	beforeEach(() => {
		global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
		document.documentElement.style.removeProperty("--header-height");
	});

	it("updates --header-height when the header itself changes size", () => {
		const { getByTestId } = render(<Header />);
		const header = getByTestId("header");
		expect(observe).toHaveBeenCalledWith(header);

		// A larger font size makes the header taller without a window resize
		setHeaderHeight(header, 60);
		act(() => resizeCallback());

		expect(headerHeightVar()).toBe("60px");
	});

	it("stops observing the header on unmount", () => {
		const { unmount } = render(<Header />);
		unmount();
		expect(disconnect).toHaveBeenCalled();
	});
});
