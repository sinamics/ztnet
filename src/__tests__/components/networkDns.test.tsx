import "../__mocks__/networkById";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NetworkDns } from "~/components/modules/networkDns";
import { NextRouter, useRouter } from "next/router";
import { api } from "~/utils/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";

// Mocking the next/router module
jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));

const mockedRouter: Partial<NextRouter> = {
	query: {
		id: "test-id",
	},
};
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
mockUseRouter.mockReturnValue(mockedRouter as NextRouter);

describe("<NetworkDns />", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
		(useRouter as jest.Mock).mockImplementation(() => ({
			query: {
				id: "test-id",
			},
		}));
	});
	it("sends the correct DNS IP to the server when submitted", async () => {
		const mockMutation = jest.fn();

		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "test-id",
					dns: {
						domain: "",
						servers: [],
					},
				},
			},
			isLoading: false,
			refetch: jest.fn(),
		});

		api.network.getNetworkById.useQuery = useQueryMock;
		api.network.dns.useMutation = jest.fn().mockReturnValue({
			mutate: mockMutation,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlProvider locale="en" messages={enTranslation}>
					<NetworkDns />
				</NextIntlProvider>
			</QueryClientProvider>,
		);

		// Simulate typing in the DNS IP address
		const dnsInput = screen.getByPlaceholderText("10.147.20.190");
		fireEvent.change(dnsInput, { target: { value: "192.168.1.1" } });

		const dnsDomain = screen.getByPlaceholderText("home.arpa");
		fireEvent.change(dnsDomain, { target: { value: "test-domain" } });

		// Simulate clicking the submit button
		const submitButton = screen.getByText("Submit");
		fireEvent.click(submitButton);

		// Verify the mock API mutation is called with the right value
		await waitFor(() => {
			expect(mockMutation).toHaveBeenCalledWith(
				expect.objectContaining({
					central: false,
					nwid: "test-id",
					updateParams: {
						dns: {
							domain: "test-domain",
							servers: ["192.168.1.1"],
						},
					},
				}),
				expect.anything(),
			);
		});
	});
});
