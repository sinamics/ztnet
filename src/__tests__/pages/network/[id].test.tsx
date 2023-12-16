import "../../__mocks__/networkById";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NetworkById from "~/pages/network/[id]";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import { api } from "../../../utils/api";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getServerSideProps } from "~/server/getServerSideProps";
import { GetServerSidePropsContext } from "next";
import { ParsedUrlQuery } from "querystring";
import { getSession } from "next-auth/react";

enum ConnectionStatus {
	Offline = 0,
	Relayed = 1,
	DirectLAN = 1,
	DirectWAN = 2,
}
jest.mock("~/server/db", () => ({
	prisma: {
		organization: {
			findMany: jest.fn(),
		},
	},
}));

jest.mock("~/components/auth/withAuth", () => ({
	withAuth: jest.fn().mockImplementation((gssp) => gssp),
}));
// Mock the next-auth/react module
jest.mock("next-auth/react", () => ({
	getSession: jest.fn(), // Mock getSession as a jest function
}));
jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));
describe("NetworkById component", () => {
	beforeAll(() => {
		process.env.NEXT_PUBLIC_NODE_ENV = "test";
	});
	let queryClient: QueryClient;
	beforeEach(() => {
		queryClient = new QueryClient();
		(useRouter as jest.Mock).mockImplementation(() => ({
			query: {
				id: "test-id",
			},
		}));

		// Mock getSession to return a simulated user session
		(getSession as jest.Mock).mockResolvedValue({
			user: {
				name: "Test User",
				email: "test@example.com",
			},
		});
	});
	it("renders loading element when data is being fetched", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: null,
			isLoading: true,
			refetch: jest.fn(),
		});
		api.network.getNetworkById.useQuery = useQueryMock;
		const context = {
			params: { orgIds: [] } as ParsedUrlQuery,
			locale: "en",
		};
		// @ts-expect-error
		const { props } = await getServerSideProps(context as GetServerSidePropsContext);

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById {...props} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		// expect(screen.getByText(/loading/i)).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("renders network details correctly", () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "1234567890",
					name: "Test Network",
					private: true,
					ipAssignmentPools: [{ ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" }],
					routes: [{ target: "10.0.0.0/24" }],
					multicastLimit: 32,
					enableBroadcast: true,
				},
				members: [],
			},
			isLoading: false,
			refetch: jest.fn(),
		});
		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		// await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

		expect(screen.getByText(/Network ID:/i)).toBeInTheDocument();
		expect(screen.getByText(/Network Name:/i)).toBeInTheDocument();
		expect(screen.getByText(/Test Network/i)).toBeInTheDocument();
		// expect(screen.getByText(/Network Auth/i)).toBeInTheDocument();
	});

	test("renders Network Settings divider", () => {
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		expect(screen.getByText(/Network Settings/i)).toBeInTheDocument();
	});

	test("renders Network Members divider", () => {
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		const matches = screen.getAllByText(/Network Members/i);
		expect(matches.length).toBe(2);
	});

	test("renders Network Start, Network End, and Network Cidr labels", () => {
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		expect(screen.getByText(/Network Start:/i)).toBeInTheDocument();
		expect(screen.getByText(/Network End:/i)).toBeInTheDocument();
		expect(screen.getByText(/Network Cidr:/i)).toBeInTheDocument();
	});

	test("renders warning message", () => {
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		expect(
			screen.getByText(
				/Join this network ID and the device will automatically be displayed/,
			),
		).toBeInTheDocument();
	});

	test("edit network name", async () => {
		// screen.debug();
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		const editIcon = screen.getByTestId("changeNetworkName");
		await userEvent.click(editIcon);

		const input: HTMLInputElement = screen.getByPlaceholderText("Test Network");

		await userEvent.type(input, "New Network Name");
		expect(input).toHaveValue("Test NetworkNew Network Name");
		fireEvent.submit(input);
		// hack to hide the input by toggle the edit icon
		await userEvent.click(editIcon);

		await waitFor(() => expect(input).not.toBeInTheDocument());
	});

	it("renders Members table correctly", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "network_id",
					name: "Test Network",
					private: true,
					ipAssignmentPools: [{ ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" }],
					routes: [{ target: "10.0.0.0/24" }],
					multicastLimit: 32,
					enableBroadcast: true,
				},
				members: [
					{
						nodeid: 1,
						id: "member_id",
						nwid: "network_id",
						lastSeen: "2023-08-09T18:02:14.723Z",
						name: "members_name",
						creationTime: 1691603143446,
						ipAssignments: ["10.121.15.173"],
						peers: {
							physicalAddress: "10.10.10.10",
						},
						conStatus: 0,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
		});
		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		// await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
		// Ensure table is present
		screen.getByRole("table"); // This will throw an error if the table is not present

		await waitFor(
			() => {
				expect(screen.getByDisplayValue(/members_name/i)).toBeInTheDocument();
				expect(screen.getByText(/network_id/i)).toBeInTheDocument();
				expect(screen.getByText(/10.10.10.10/i)).toBeInTheDocument();
				expect(screen.getByRole("button", { name: /options/i })).toBeInTheDocument();
			},
			{ timeout: 5000 },
		);
	});
	// Test for ONLINE status
	it("renders DIRECT WAN status correctly", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "network_id",
					ipAssignmentPools: [{ ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" }],
					routes: [{ target: "10.0.0.0/24" }],
					multicastLimit: 32,
				},
				members: [
					{
						id: "member_id",
						creationTime: 1691603143446,
						lastSeen: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
						conStatus: ConnectionStatus.DirectWAN,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
		});

		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		await waitFor(
			() => {
				expect(screen.getByText("DIRECT")).toHaveClass("text-success");
			},
			{ timeout: 2000 },
		);
	});
	// Test for Relayed status
	it("renders RELAYED status correctly", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "network_id",
					ipAssignmentPools: [{ ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" }],
					routes: [{ target: "10.0.0.0/24" }],
					multicastLimit: 32,
				},
				members: [
					{
						id: "member_id",
						creationTime: 1691603143446,
						lastSeen: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
						conStatus: ConnectionStatus.Relayed,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
		});

		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		await waitFor(
			() => {
				expect(screen.getByText("RELAYED")).toHaveClass("text-warning");
			},
			{ timeout: 2000 },
		);
	});
	// Test for Offline status
	it("renders OFFLINE status correctly", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: {
				network: {
					nwid: "network_id",
					ipAssignmentPools: [{ ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" }],
					routes: [{ target: "10.0.0.0/24" }],
					multicastLimit: 32,
				},
				members: [
					{
						id: "member_id",
						creationTime: 1691603143446,
						lastSeen: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
						conStatus: ConnectionStatus.Offline,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
		});

		api.network.getNetworkById.useQuery = useQueryMock;

		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<NetworkById orgIds={null} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
		await waitFor(
			() => {
				expect(screen.getByText("offline")).toHaveClass("text-error");
			},
			{ timeout: 2000 },
		);
	});
});
