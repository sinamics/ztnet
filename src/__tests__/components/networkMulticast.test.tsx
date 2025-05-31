import "../__mocks__/networkById";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { type NextRouter, useRouter } from "next/router";
import { api } from "~/utils/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";
import { NetworkMulticast } from "~/components/networkByIdPage/networkMulticast";

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

describe("<NetworkMulticast />", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
		(useRouter as jest.Mock).mockImplementation(() => ({
			query: {
				id: "test-id",
			},
		}));
	});

	it("sends the correct multicastLimit to the server when submitted", async () => {
		const mockMutation = jest.fn().mockReturnValue({
			organizationId: "orgId",
		});

		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "test-id",
					multicastLimit: 5,
					enableBroadcast: false,
				},
			},
			isLoading: false,
			refetch: jest.fn(),
		});

		api.network.getNetworkById.useQuery = useQueryMock;
		api.network.multiCast.useMutation = jest.fn().mockReturnValue({
			mutate: mockMutation,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkMulticast />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		// Simulate typing in the multicastLimit
		const multicastLimitInput = screen.getByPlaceholderText("Number");
		fireEvent.change(multicastLimitInput, { target: { value: "10" } });

		const submitButton = screen.getByText("Submit");
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockMutation).toHaveBeenCalledWith(
				expect.objectContaining({
					central: false,
					nwid: "test-id",
					organizationId: undefined,
					updateParams: {
						multicastLimit: 10,
					},
				}),
			);
		});
	});

	it("toggles enableBroadcast correctly", async () => {
		// ... Most of the mocking stays the same ...
		const mockMutation = jest.fn();

		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "test-id",
					multicastLimit: 5,
					enableBroadcast: false,
				},
			},
			isLoading: false,
			refetch: jest.fn(),
		});

		api.network.getNetworkById.useQuery = useQueryMock;
		api.network.multiCast.useMutation = jest.fn().mockReturnValue({
			mutate: mockMutation,
		});
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkMulticast />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		const enableBroadcastCheckbox = screen.getByLabelText("Enable Broadcast");
		fireEvent.click(enableBroadcastCheckbox);

		await waitFor(() => {
			expect(mockMutation).toHaveBeenCalledWith(
				expect.objectContaining({
					central: false,
					nwid: "test-id",
					organizationId: undefined,
					updateParams: {
						enableBroadcast: true,
					},
				}),
			);
		});
	});
});
