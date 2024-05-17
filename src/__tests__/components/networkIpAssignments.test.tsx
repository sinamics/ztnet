import "../__mocks__/networkById";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextRouter, useRouter } from "next/router";
import { api } from "~/utils/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";
import { NetworkIpAssignment } from "~/components/networkByIdPage/networkIpAssignments";

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

describe("<NetworkIpAssignment />", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
		(useRouter as jest.Mock).mockImplementation(() => ({
			query: {
				id: "test-id",
			},
		}));
	});

	it("should display loading state initially", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: null,
			isLoading: true,
		});
		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkIpAssignment />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		expect(screen.getByText(/Loading/i)).toBeInTheDocument();
	});

	it("renders the IP assignment content after loading", async () => {
		const mockData = {
			network: {
				duplicateRoutes: [],
				v4AssignMode: {
					zt: false,
				},
				cidr: [],
			},
		};

		const useQueryMock = jest.fn().mockReturnValue({
			data: mockData,
			isLoading: false,
		});
		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkIpAssignment />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
			// Add more assertions related to your content here
		});
	});

	it("should toggle auto assign from range", async () => {
		const mockData = {
			// This object is used to mock the data returned by the API
			network: {
				duplicateRoutes: [],
				v4AssignMode: {
					zt: false,
				},
				cidr: ["192.168.0.0/24"],
				routes: [],
			},
		};

		api.network.getNetworkById.useQuery = jest.fn().mockReturnValue({
			data: mockData,
			isLoading: false,
		});

		api.network.enableIpv4AutoAssign.useMutation = jest.fn().mockReturnValue({
			mutate: jest.fn(() => {
				mockData.network.v4AssignMode.zt = true;
			}),
		});

		// Render the component
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkIpAssignment />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		// Simulate the checkbox being checked
		const checkbox = screen.getByTestId("auto-assign-checkbox");
		fireEvent.change(checkbox, { target: { checked: true } });

		// Wait for the checkbox to be checked and the API function to be called
		await waitFor(() => {
			expect(checkbox).toBeChecked();
			expect(api.network.enableIpv4AutoAssign.useMutation).toHaveBeenCalled();
		});
	});

	it("should handle easy IP assignment", async () => {
		const mockData = {
			network: {
				duplicateRoutes: [],
				v4AssignMode: {
					zt: true, // Ensure checkbox is checked to show easy IP assignment
				},
				cidr: ["192.168.0.0/24"],
				routes: [],
			},
		};

		api.network.getNetworkById.useQuery = jest.fn().mockReturnValue({
			data: mockData,
			isLoading: false,
		});

		api.network.easyIpAssignment.useMutation = jest.fn().mockReturnValue({
			mutate: jest.fn(() => {}),
		});

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkIpAssignment />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			fireEvent.click(screen.getByText("192.168.0.0/24"));
		});

		expect(api.network.easyIpAssignment.useMutation).toHaveBeenCalled();
	});

	it("should handle advanced IP assignment - addition of IP range", async () => {
		const mockData = {
			network: {
				duplicateRoutes: [],
				v4AssignMode: {
					zt: true, // Ensure checkbox is checked to show advanced IP assignment
				},
				ipAssignmentPools: [],
				cidr: [],
			},
		};

		api.network.getNetworkById.useQuery = jest.fn().mockReturnValue({
			data: mockData,
			isLoading: false,
		});

		api.network.advancedIpAssignment.useMutation = jest.fn().mockReturnValue({
			mutate: jest.fn(() => {}),
		});

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkIpAssignment />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			fireEvent.click(screen.getByText("Advanced"));
		});

		await waitFor(() => {
			// Fill in the IP range start and end fields
			fireEvent.change(screen.getByPlaceholderText(/192.168.168.1/i), {
				target: { value: "192.168.1.1" },
			});
			fireEvent.change(screen.getByPlaceholderText(/192.168.168.254/i), {
				target: { value: "192.168.1.255" },
			});
		});

		// I assume there's a button to submit the range. Adjust as needed.
		await waitFor(() => {
			fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
		});

		expect(api.network.advancedIpAssignment.useMutation).toHaveBeenCalled();
	});

	// Clear mock functions after each test
	afterEach(() => {
		jest.clearAllMocks();
	});
});
