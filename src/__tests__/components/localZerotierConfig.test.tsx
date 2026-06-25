import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LocalZerotierConfig from "~/components/adminPage/controller/localZerotierConfig";
import enTranslation from "~/locales/en/common.json";
import { api } from "~/utils/api";

jest.mock("~/utils/api", () => ({
	api: {
		useContext: jest.fn(),
		admin: {
			getLocalZerotierConfig: { useQuery: jest.fn() },
			saveLocalZerotierConfig: { useMutation: jest.fn() },
			getControllerStats: { useQuery: jest.fn() },
		},
	},
}));

const mockedApi = api as unknown as {
	useContext: jest.Mock;
	admin: {
		getLocalZerotierConfig: { useQuery: jest.Mock };
		saveLocalZerotierConfig: { useMutation: jest.Mock };
		getControllerStats: { useQuery: jest.Mock };
	};
};

const renderComponent = () =>
	render(
		<NextIntlClientProvider locale="en" messages={enTranslation}>
			<LocalZerotierConfig />
		</NextIntlClientProvider>,
	);

describe("LocalZerotierConfig", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedApi.useContext.mockReturnValue({
			admin: {
				getLocalZerotierConfig: { invalidate: jest.fn() },
				getControllerStats: { invalidate: jest.fn() },
			},
		});
		mockedApi.admin.saveLocalZerotierConfig.useMutation.mockReturnValue({
			mutate: jest.fn(),
			isLoading: false,
		});
	});

	it("renders a visible local ZeroTier config panel and expands values from local.conf", () => {
		mockedApi.admin.getLocalZerotierConfig.useQuery.mockReturnValue({
			data: {
				primaryPort: 10001,
				secondaryPort: null,
				allowSecondaryPort: false,
				portMappingEnabled: false,
				interfacePrefixBlacklist: ["docker"],
				bindAddresses: ["203.0.113.10"],
				allowManagementFrom: ["127.0.0.1/32"],
				defaultBondingPolicy: "active-backup",
				multithreaded: true,
				linuxKernelMode: false,
				canWrite: true,
				configPath: "/var/lib/zerotier-one/local.conf",
			},
			error: null,
			isLoading: false,
		});

		renderComponent();
		expect(screen.getByText("Local ZeroTier Config")).toBeInTheDocument();
		expect(screen.getByText(/docker restart zerotier/i)).toBeInTheDocument();
		expect(screen.getByText("10001")).toBeInTheDocument();
		expect(screen.queryByLabelText(/primary port/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /configure local zerotier/i }));

		expect(screen.getByLabelText(/primary port/i)).toHaveValue(10001);
		expect(screen.getByLabelText(/interface prefix blacklist/i)).toHaveValue("docker");
		expect(screen.getByLabelText(/bind addresses/i)).toHaveValue("203.0.113.10");
		expect(screen.getByLabelText(/allow management from/i)).toHaveValue("127.0.0.1/32");
	});

	it("disables save when local.conf cannot be read", () => {
		mockedApi.admin.getLocalZerotierConfig.useQuery.mockReturnValue({
			data: null,
			error: { message: "Could not parse zerotier-one/local.conf." },
			isLoading: false,
		});

		renderComponent();
		fireEvent.click(screen.getByRole("button", { name: /configure local zerotier/i }));

		expect(screen.getByText("Could not parse zerotier-one/local.conf.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save config/i })).toBeDisabled();
	});

	it("submits normalized config values", () => {
		const mutate = jest.fn();
		mockedApi.admin.saveLocalZerotierConfig.useMutation.mockReturnValue({
			mutate,
			isLoading: false,
		});
		mockedApi.admin.getLocalZerotierConfig.useQuery.mockReturnValue({
			data: {
				primaryPort: 9993,
				secondaryPort: null,
				allowSecondaryPort: null,
				portMappingEnabled: null,
				interfacePrefixBlacklist: [],
				bindAddresses: [],
				allowManagementFrom: [],
				defaultBondingPolicy: null,
				multithreaded: null,
				linuxKernelMode: null,
				canWrite: true,
				configPath: "/var/lib/zerotier-one/local.conf",
			},
			error: null,
			isLoading: false,
		});

		renderComponent();
		fireEvent.click(screen.getByRole("button", { name: /configure local zerotier/i }));
		fireEvent.change(screen.getByLabelText(/primary port/i), {
			target: { value: "10001" },
		});
		fireEvent.change(screen.getByLabelText(/interface prefix blacklist/i), {
			target: { value: "docker, veth" },
		});
		fireEvent.click(screen.getByLabelText(/multithreaded/i));
		fireEvent.click(screen.getByRole("button", { name: /save config/i }));

		expect(mutate).toHaveBeenCalledWith({
			primaryPort: 10001,
			secondaryPort: null,
			allowSecondaryPort: null,
			interfacePrefixBlacklist: ["docker", "veth"],
			bindAddresses: [],
			allowManagementFrom: [],
			defaultBondingPolicy: null,
			multithreaded: true,
			linuxKernelMode: null,
		});
	});
});
