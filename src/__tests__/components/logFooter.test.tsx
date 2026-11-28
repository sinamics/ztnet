import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/router";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";
import { api } from "~/utils/api";
import { useLogAsideStore } from "~/utils/store";
import { LogsFooter } from "~/components/layouts/logFooter";

jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));

jest.mock("~/utils/api", () => ({
	api: { org: { getLogs: { useQuery: jest.fn() } } },
}));

const codeMirrorProps = jest.fn();
jest.mock("@uiw/react-codemirror", () => ({
	__esModule: true,
	default: (props: { value?: string; readOnly?: boolean }) => {
		codeMirrorProps(props);
		return <pre data-testid="log-text">{props.value}</pre>;
	},
}));
jest.mock("@uiw/codemirror-theme-okaidia", () => ({ okaidia: {} }));

const useQuery = api.org.getLogs.useQuery as jest.Mock;
const mockRouter = (query: Record<string, string>) =>
	(useRouter as jest.Mock).mockReturnValue({ query });

const queryResult = (overrides = {}) => ({
	data: undefined,
	error: null,
	refetch: jest.fn(),
	isFetching: false,
	...overrides,
});

const renderFooter = () =>
	render(
		<NextIntlClientProvider locale="en" messages={enTranslation}>
			<LogsFooter sidebarOpen={false} asideOpen={false} />
		</NextIntlClientProvider>,
	);

const lastQueryOptions = () => useQuery.mock.calls.at(-1)[1];

describe("<LogsFooter />", () => {
	beforeEach(() => {
		useLogAsideStore.setState({ open: true });
		mockRouter({ orgid: "org-1" });
		useQuery.mockReturnValue(queryResult());
	});

	it("does not fetch before the router has the organization id", () => {
		mockRouter({});
		renderFooter();
		expect(lastQueryOptions()).toEqual({ enabled: false });
	});

	it("fetches only while the panel is open", () => {
		useLogAsideStore.setState({ open: false });
		renderFooter();
		expect(lastQueryOptions()).toEqual({ enabled: false });

		fireEvent.click(screen.getByRole("button", { name: "Toggle logs" }));
		expect(useQuery).toHaveBeenLastCalledWith(
			{ organizationId: "org-1" },
			{ enabled: true },
		);
	});

	it("shows the logs read only", () => {
		useQuery.mockReturnValue(
			queryResult({
				data: [
					{
						id: 7,
						action: "Created a new network: abc",
						createdAt: "2026-01-01T00:00:00.000Z",
						performedBy: { name: "Alice" },
					},
				],
			}),
		);
		renderFooter();
		expect(screen.getByTestId("log-text")).toHaveTextContent(
			"Alice - Created a new network: abc",
		);
		expect(codeMirrorProps).toHaveBeenLastCalledWith(
			expect.objectContaining({ readOnly: true }),
		);
	});

	it("shows the error instead of an empty log", () => {
		useQuery.mockReturnValue(
			queryResult({ error: { message: "You are not a member of this organization." } }),
		);
		renderFooter();
		expect(screen.getByTestId("log-text")).toHaveTextContent(
			"You are not a member of this organization.",
		);
	});

	it("reserves the panel height while open and fits the log inside it", () => {
		const { container, rerender } = renderFooter();
		expect(container.querySelector('div[aria-hidden="true"].h-52')).not.toBeNull();
		expect(codeMirrorProps).toHaveBeenLastCalledWith(
			expect.objectContaining({ maxHeight: "11.5rem", className: "custom-scrollbar" }),
		);

		useLogAsideStore.setState({ open: false });
		rerender(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<LogsFooter sidebarOpen={false} asideOpen={false} />
			</NextIntlClientProvider>,
		);
		expect(container.querySelector('div[aria-hidden="true"].h-52')).toBeNull();
	});

	it("pins the panel to the bottom of the viewport", () => {
		renderFooter();
		expect(screen.getByTestId("logs-panel")).toHaveClass("fixed", "bottom-0", "h-52");
		expect(screen.getByTestId("logs-panel")).not.toHaveClass("absolute");
	});

	it("keeps the open toggle above the panel at every font size", () => {
		renderFooter();
		// both use the 52 spacing step (13rem), so the panel never covers the toggle
		expect(screen.getByRole("button", { name: "Toggle logs" })).toHaveClass("bottom-52");
	});

	it("shows the loading state while a refresh is running", () => {
		useQuery.mockReturnValue(queryResult({ data: [], isFetching: true }));
		renderFooter();
		expect(screen.getByText("Fetching logs...")).toBeInTheDocument();
	});
});
