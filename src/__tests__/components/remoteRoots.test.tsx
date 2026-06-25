import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import RemoteRoots from "~/components/adminPage/controller/remoteRoots";
import enTranslation from "~/locales/en/common.json";
import { api } from "~/utils/api";

jest.mock("~/utils/api", () => ({
	api: {
		useContext: jest.fn(),
		admin: {
			remoteRoots: {
				list: { useQuery: jest.fn() },
				create: { useMutation: jest.fn() },
				update: { useMutation: jest.fn() },
				delete: { useMutation: jest.fn() },
				testSsh: { useMutation: jest.fn() },
				installZerotier: { useMutation: jest.fn() },
				upgradeZerotier: { useMutation: jest.fn() },
				restartZerotier: { useMutation: jest.fn() },
				changeZerotierPort: { useMutation: jest.fn() },
				saveRemoteConfig: { useMutation: jest.fn() },
				distributePlanet: { useMutation: jest.fn() },
				restoreOfficialPlanet: { useMutation: jest.fn() },
				readRemoteConfig: { useMutation: jest.fn() },
				checkHealth: { useMutation: jest.fn() },
				resolveDomain: { useMutation: jest.fn() },
				buildPlanetRootEntries: { useMutation: jest.fn() },
			},
			getPlanet: { useQuery: jest.fn() },
			makeWorld: { useMutation: jest.fn() },
		},
	},
}));

const mockedApi = api as unknown as {
	useContext: jest.Mock;
	admin: {
		remoteRoots: Record<string, { useQuery?: jest.Mock; useMutation?: jest.Mock }>;
		getPlanet: { useQuery: jest.Mock };
		makeWorld: { useMutation: jest.Mock };
	};
};

const mutationResult = {
	mutate: jest.fn(),
	mutateAsync: jest.fn(),
	isLoading: false,
};

const remoteRoot = {
	id: "root_1",
	name: "Tokyo Root",
	host: "203.0.113.10",
	sshPort: 22,
	sshUser: "root",
	status: "DEGRADED",
	identity:
		"685a4651a7:0:755f89d16ea85e0f5a9db1cdd7f4846b73b193378cc17600a7261053409f08299f6cb516dfd566359c48073af8b6ae831f996745d5e10d18dc4dd487b8ad11e3",
	primaryPort: 9993,
	endpointSource: "MANUAL_IP",
	domainName: null,
	selectedIp: null,
	selectedIps: [],
	resolvedIps: ["203.0.113.10"],
	endpointCandidates: [
		{ ip: "203.0.113.10", source: "PUBLIC_IP", port: 9993 },
		{ ip: "10.0.0.5", source: "INTERFACE_IP", port: 9993 },
	],
	zerotierInstalled: true,
	serviceStatus: "RUNNING",
	startupStatus: "ENABLED",
	secondaryPort: null,
	allowSecondaryPort: false,
	interfacePrefixBlacklist: ["docker"],
	bindAddresses: ["203.0.113.10"],
	allowManagementFrom: ["127.0.0.1/32"],
	defaultBondingPolicy: "active-backup",
	multithreaded: true,
	linuxKernelMode: false,
	portMappingEnabled: false,
	sshStatus: "OK",
	panelStatus: "DEGRADED",
	sshLastError: null,
	panelLastError: "No selected endpoint IP is configured.",
	planetStatus: "OFFICIAL_RESTORED",
	remotePlanetHash: "abc123",
	remoteOfficialPlanetHash: "def456",
	lastReadAt: new Date("2026-06-25T07:00:00.000Z"),
	lastPlanetSyncAt: null,
	lastCheckAt: null,
	lastError: "No selected endpoint IP is configured.",
	enabled: true,
	credential: {
		id: "credential_1",
		publicKey: "ssh-ed25519 public ztnet-remote-root",
		createdAt: new Date(),
	},
	tasks: [
		{
			id: "task_json",
			type: "READ_CONFIG",
			status: "SUCCESS",
			logs: [
				JSON.stringify({
					primaryPort: 10001,
					zerotierVersion: "1.16.2",
					serviceStatus: "RUNNING",
					startupStatus: "ENABLED",
				}),
			],
			createdAt: new Date(),
		},
	],
	createdAt: new Date(),
	updatedAt: new Date(),
};

const checkingRemoteRoot = {
	...remoteRoot,
	tasks: [
		{
			id: "task_1",
			type: "CHECK",
			status: "RUNNING",
			logs: [],
			createdAt: new Date(),
		},
	],
};

const unreadRemoteRoot = {
	...remoteRoot,
	lastReadAt: null,
	zerotierInstalled: false,
	sshStatus: "UNKNOWN",
	serviceStatus: "UNKNOWN",
};

const renderRemoteRoots = () =>
	render(
		<NextIntlClientProvider locale="en" messages={enTranslation}>
			<RemoteRoots />
		</NextIntlClientProvider>,
	);

describe("RemoteRoots", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedApi.useContext.mockReturnValue({
			admin: {
				remoteRoots: { list: { invalidate: jest.fn() } },
				getPlanet: { invalidate: jest.fn() },
			},
		});
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [],
			isLoading: false,
		});
		for (const hookName of [
			"create",
			"update",
			"delete",
			"testSsh",
			"installZerotier",
			"upgradeZerotier",
			"restartZerotier",
			"changeZerotierPort",
			"saveRemoteConfig",
			"distributePlanet",
			"restoreOfficialPlanet",
			"readRemoteConfig",
			"checkHealth",
			"resolveDomain",
			"buildPlanetRootEntries",
		]) {
			mockedApi.admin.remoteRoots[hookName]?.useMutation?.mockReturnValue(mutationResult);
		}
		mockedApi.admin.makeWorld.useMutation.mockReturnValue(mutationResult);
	});

	it("does not render remote planet roots before a custom planet exists", () => {
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({ data: null, isLoading: false });

		renderRemoteRoots();

		expect(screen.queryByText("Remote Planet Roots")).not.toBeInTheDocument();
	});

	it("renders remote planet roots after a custom planet exists", () => {
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		expect(screen.getByText("Remote Planet Roots")).toBeInTheDocument();
	});

	it("renders the remote roots table at full available width", () => {
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [remoteRoot],
			isLoading: false,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		const table = screen.getByRole("table");
		expect(table).toHaveClass("w-full");
		expect(table).toHaveClass("min-w-[920px]");
		expect(table.parentElement).toHaveClass("w-full");
	});

	it("shows an empty state without rendering a table when no remote roots exist", () => {
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		expect(screen.getByText("No remote roots yet")).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Append healthy roots to planet" }),
		).toBeDisabled();
	});

	it("keeps the empty remote roots state visible while an empty list refetches", () => {
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [],
			isLoading: true,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		expect(screen.getByText("No remote roots yet")).toBeInTheDocument();
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("shows the empty remote roots state while the list query has no data yet", () => {
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		expect(screen.getByText("No remote roots yet")).toBeInTheDocument();
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("validates the add root form before submitting", () => {
		const createMutation = { ...mutationResult, mutate: jest.fn() };
		mockedApi.admin.remoteRoots.create.useMutation?.mockReturnValue(createMutation);
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		fireEvent.click(screen.getByRole("button", { name: "Add root" }));

		expect(createMutation.mutate).not.toHaveBeenCalled();
		expect(screen.getAllByText("Required")).toHaveLength(2);
	});

	it("rejects invalid ports and requires a domain for domain endpoints", () => {
		const createMutation = { ...mutationResult, mutate: jest.fn() };
		mockedApi.admin.remoteRoots.create.useMutation?.mockReturnValue(createMutation);
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		fireEvent.change(screen.getByPlaceholderText("Name"), {
			target: { value: "Tokyo Root" },
		});
		fireEvent.change(screen.getByPlaceholderText("Host"), {
			target: { value: "203.0.113.10" },
		});
		fireEvent.change(screen.getByPlaceholderText("SSH user"), {
			target: { value: "root" },
		});
		fireEvent.change(screen.getByPlaceholderText("SSH port"), {
			target: { value: "70000" },
		});
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "DOMAIN" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add root" }));

		expect(createMutation.mutate).not.toHaveBeenCalled();
		expect(screen.getByText("Enter a port from 1 to 65535")).toBeInTheDocument();
		expect(screen.getByText("Domain is required")).toBeInTheDocument();
	});

	it("submits a trimmed valid root form", () => {
		const createMutation = { ...mutationResult, mutate: jest.fn() };
		mockedApi.admin.remoteRoots.create.useMutation?.mockReturnValue(createMutation);
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		fireEvent.change(screen.getByPlaceholderText("Name"), {
			target: { value: "  Tokyo Root  " },
		});
		fireEvent.change(screen.getByPlaceholderText("Host"), {
			target: { value: "  203.0.113.10  " },
		});
		fireEvent.change(screen.getByPlaceholderText("SSH user"), {
			target: { value: "  root  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add root" }));

		expect(createMutation.mutate).toHaveBeenCalledWith({
			name: "Tokyo Root",
			host: "203.0.113.10",
			sshUser: "root",
			sshPort: 22,
			endpointSource: "MANUAL_IP",
			domainName: null,
			selectedIp: null,
			selectedIps: [],
			primaryPort: 9993,
		});
	});

	it("opens root details in a dialog with editable endpoint and full health actions", () => {
		const checkMutation = { ...mutationResult, mutate: jest.fn() };
		const updateMutation = { ...mutationResult, mutate: jest.fn() };
		mockedApi.admin.remoteRoots.checkHealth.useMutation?.mockReturnValue(checkMutation);
		mockedApi.admin.remoteRoots.update.useMutation?.mockReturnValue(updateMutation);
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [remoteRoot],
			isLoading: false,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		fireEvent.click(screen.getByRole("button", { name: "Details" }));

		const dialog = screen.getByRole("dialog", { name: "Tokyo Root" });
		expect(within(dialog).queryByRole("button", { name: "Key" })).not.toBeInTheDocument();
		expect(within(dialog).getByText("Managed SSH public key")).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				"Add this public key to the remote user's ~/.ssh/authorized_keys before connecting.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Copy public key" }),
		).toBeInTheDocument();
		expect(
			within(dialog).getByDisplayValue("ssh-ed25519 public ztnet-remote-root"),
		).toBeInTheDocument();
		expect(within(dialog).getByText("SSH OK")).toBeInTheDocument();
		expect(within(dialog).getByText("Endpoint degraded")).toBeInTheDocument();
		expect(within(dialog).getByText("Startup enabled")).toBeInTheDocument();
		expect(within(dialog).getByText("Official planet")).toBeInTheDocument();
		expect(within(dialog).queryByText("OFFICIAL_RESTORED")).not.toBeInTheDocument();
		expect(within(dialog).getByText("Node ID 685a4651a7")).toBeInTheDocument();
		expect(
			within(dialog).queryByText(remoteRoot.identity, { exact: false }),
		).not.toBeInTheDocument();
		expect(
			within(dialog).getByText(
				"Read ZeroTier 1.16.2, service running, startup enabled. UDP port 10001.",
			),
		).toBeInTheDocument();
		expect(
			within(dialog).queryByText('"primaryPort"', { exact: false }),
		).not.toBeInTheDocument();
		expect(within(dialog).getByLabelText("Endpoint IP")).toHaveValue("");
		expect(within(dialog).getByLabelText("ZeroTier UDP port")).toHaveValue(9993);

		fireEvent.change(within(dialog).getByLabelText("Endpoint IP"), {
			target: { value: "203.0.113.10" },
		});
		fireEvent.click(within(dialog).getByRole("button", { name: "Add endpoint" }));
		fireEvent.click(within(dialog).getByRole("button", { name: "Save endpoint" }));

		expect(updateMutation.mutate).toHaveBeenCalledWith({
			id: "root_1",
			selectedIp: "203.0.113.10",
			selectedIps: ["203.0.113.10"],
		});

		fireEvent.click(within(dialog).getByRole("button", { name: "Check root" }));
		expect(checkMutation.mutate).toHaveBeenCalledWith({ nodeId: "root_1" });
	});

	it("refreshes the endpoint draft port when a read updates the selected root", () => {
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [remoteRoot],
			isLoading: false,
		});
		const { rerender } = renderRemoteRoots();

		fireEvent.click(screen.getByRole("button", { name: "Details" }));
		expect(screen.getByLabelText("ZeroTier UDP port")).toHaveValue(9993);

		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [{ ...remoteRoot, primaryPort: 10001, selectedIp: "203.0.113.20" }],
			isLoading: false,
		});
		rerender(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<RemoteRoots />
			</NextIntlClientProvider>,
		);

		expect(screen.getByLabelText("ZeroTier UDP port")).toHaveValue(10001);
		expect(screen.getAllByText("203.0.113.20/10001").length).toBeGreaterThan(0);
	});

	it("shows running health checks without blocking the details dialog", () => {
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [checkingRemoteRoot],
			isLoading: false,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		expect(screen.getByText("Checking")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Details" }));
		const dialog = screen.getByRole("dialog", { name: "Tokyo Root" });
		expect(within(dialog).getByText("Checking")).toBeInTheDocument();
	});

	it("groups managed ZeroTier and planet actions in the details dialog", () => {
		const saveConfigMutation = { ...mutationResult, mutate: jest.fn() };
		const distributeMutation = { ...mutationResult, mutate: jest.fn() };
		const restoreMutation = { ...mutationResult, mutate: jest.fn() };
		mockedApi.admin.remoteRoots.saveRemoteConfig.useMutation?.mockReturnValue(
			saveConfigMutation,
		);
		mockedApi.admin.remoteRoots.distributePlanet.useMutation?.mockReturnValue(
			distributeMutation,
		);
		mockedApi.admin.remoteRoots.restoreOfficialPlanet.useMutation?.mockReturnValue(
			restoreMutation,
		);
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [remoteRoot],
			isLoading: false,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		fireEvent.click(screen.getByRole("button", { name: "Details" }));
		const dialog = screen.getByRole("dialog", { name: "Tokyo Root" });

		expect(within(dialog).getByText("Connection")).toBeInTheDocument();
		expect(within(dialog).getByText("ZeroTier")).toBeInTheDocument();
		expect(within(dialog).getByText("Endpoint")).toBeInTheDocument();
		expect(within(dialog).getByText("Planet")).toBeInTheDocument();
		expect(within(dialog).getAllByText("203.0.113.10").length).toBeGreaterThan(0);
		expect(
			within(dialog).queryByRole("button", { name: "Connect & Read" }),
		).not.toBeInTheDocument();

		fireEvent.change(within(dialog).getByLabelText("ZeroTier UDP port"), {
			target: { value: "10001" },
		});
		fireEvent.click(within(dialog).getByRole("button", { name: "Save Config & Restart" }));
		expect(saveConfigMutation.mutate).toHaveBeenCalledWith({
			nodeId: "root_1",
			primaryPort: 10001,
			secondaryPort: null,
			allowSecondaryPort: false,
			interfacePrefixBlacklist: ["docker"],
			bindAddresses: ["203.0.113.10"],
			allowManagementFrom: ["127.0.0.1/32"],
			defaultBondingPolicy: "active-backup",
			multithreaded: true,
			linuxKernelMode: false,
		});

		fireEvent.click(within(dialog).getByRole("button", { name: "Distribute Planet" }));
		expect(distributeMutation.mutate).toHaveBeenCalledWith({ nodeId: "root_1" });

		fireEvent.click(
			within(dialog).getByRole("button", { name: "Restore Official Planet" }),
		);
		expect(restoreMutation.mutate).toHaveBeenCalledWith({ nodeId: "root_1" });
	});

	it("disables remote config edits until the remote ZeroTier config has been read", () => {
		mockedApi.admin.remoteRoots.list.useQuery?.mockReturnValue({
			data: [unreadRemoteRoot],
			isLoading: false,
		});
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: { id: "planet_1", rootNodes: [], plRecommend: true },
			isLoading: false,
		});

		renderRemoteRoots();

		fireEvent.click(screen.getByRole("button", { name: "Details" }));
		const dialog = screen.getByRole("dialog", { name: "Tokyo Root" });

		expect(
			within(dialog).getByText("Read the remote ZeroTier config before editing settings."),
		).toBeInTheDocument();
		expect(within(dialog).getByLabelText("ZeroTier UDP port")).toBeDisabled();
		expect(within(dialog).getByLabelText("Endpoint IP")).toBeDisabled();
		expect(
			within(dialog).getByRole("button", { name: "Save Config & Restart" }),
		).toBeDisabled();
		expect(within(dialog).getByRole("button", { name: "Save endpoint" })).toBeDisabled();
		expect(within(dialog).getByRole("button", { name: "Distribute Planet" })).toBeDisabled();
		expect(within(dialog).getByRole("button", { name: "Test SSH & Read" })).toBeEnabled();
		expect(within(dialog).getByRole("button", { name: "Read" })).toBeEnabled();
		expect(within(dialog).getByRole("button", { name: "Install" })).toBeEnabled();
	});
});
