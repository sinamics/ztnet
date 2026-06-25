import { render, screen } from "@testing-library/react";
import Controller from "~/pages/admin/controller";
import { api } from "~/utils/api";

jest.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

jest.mock("~/components/adminPage/controller/debugController", () => ({
	__esModule: true,
	default: () => <div data-testid="debug-controller" />,
}));

jest.mock("~/components/adminPage/controller/unlinkedNetworkTable", () => ({
	UnlinkedNetwork: () => <div data-testid="unlinked-network-table" />,
}));

jest.mock("~/components/adminPage/controller/zerotierUrl", () => ({
	__esModule: true,
	default: () => <div data-testid="zerotier-url" />,
}));

jest.mock("~/components/adminPage/controller/remoteRoots", () => ({
	__esModule: true,
	default: () => <section data-testid="remote-roots" />,
}));

jest.mock("~/components/adminPage/controller/localZerotierConfig", () => ({
	__esModule: true,
	default: () => <button type="button">Configure local ZeroTier</button>,
}));

jest.mock("~/utils/api", () => ({
	api: {
		admin: {
			getControllerStats: { useQuery: jest.fn() },
			unlinkedNetwork: { useQuery: jest.fn() },
		},
	},
}));

const mockedApi = api as unknown as {
	admin: {
		getControllerStats: { useQuery: jest.Mock };
		unlinkedNetwork: { useQuery: jest.Mock };
	};
};

describe("Controller layout", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedApi.admin.unlinkedNetwork.useQuery.mockReturnValue({ data: [] });
		mockedApi.admin.getControllerStats.useQuery.mockReturnValue({
			data: {
				networkCount: 1,
				totalMembers: 2,
				assignedIPs: [
					"10.147.17.10",
					"fd00:1234:5678:90ab:cdef:1111:2222:3333",
				],
				controllerStatus: {
					online: true,
					tcpFallbackActive: false,
					version: "1.16.2",
					config: {
						settings: {
							allowManagementFrom: ["127.0.0.1/32"],
							allowTcpFallbackRelay: false,
							listeningOn: [
								"10.147.17.10/9993",
								"[fd00:1234:5678:90ab:cdef:1111:2222:3333]:9993",
							],
						},
					},
				},
			},
			error: null,
		});
	});

	it("renders remote roots in a full-width controller page area", () => {
		const { container } = render(<Controller />);
		const main = container.querySelector("main");

		expect(main).toHaveClass("w-full");
		expect(main).not.toHaveClass("xl:w-6/12");
		expect(screen.getByTestId("remote-roots")).toBeInTheDocument();
		expect(
			screen
				.getByTestId("remote-roots")
				.closest('[data-testid="controller-narrow-layout"]'),
		).toBeNull();
	});

	it("keeps IPv4 address tokens compact while allowing IPv6 to wrap", () => {
		render(<Controller />);

		const assignedIpv4 = screen.getByText("10.147.17.10");
		const assignedIp = screen.getByText("fd00:1234:5678:90ab:cdef:1111:2222:3333");
		const listeningIpv4 = screen.getByText("10.147.17.10/9993");
		const listeningAddress = screen.getByText(
			"[fd00:1234:5678:90ab:cdef:1111:2222:3333]:9993",
		);

		for (const address of [assignedIpv4, assignedIp, listeningIpv4, listeningAddress]) {
			expect(address).not.toHaveClass("w-full");
			expect(address).toHaveClass("max-w-full");
			expect(address).toHaveClass("min-w-0");
			expect(address).toHaveClass("break-all");
			expect(address).toHaveClass("whitespace-normal");
			expect(address).toHaveClass("text-left");
		}
	});

	it("renders local ZeroTier config entry for admins", () => {
		render(<Controller />);

		expect(
			screen.getByRole("button", { name: "Configure local ZeroTier" }),
		).toBeInTheDocument();
	});

	it("keeps local ZeroTier config entry visible when controller stats fail", () => {
		mockedApi.admin.getControllerStats.useQuery.mockReturnValue({
			data: null,
			error: { message: "local controller unavailable" },
		});

		render(<Controller />);

		expect(screen.getByText("local controller unavailable")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Configure local ZeroTier" }),
		).toBeInTheDocument();
	});
});
