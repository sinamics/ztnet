import { checkRemoteRootHealth } from "~/server/api/services/remoteRootHealthService";
import type { RemoteRootConnection } from "~/server/api/services/remoteRootProvisioningService";
import { executeSshCommand } from "~/server/api/services/remoteRootSshService";

jest.mock("~/server/api/services/remoteRootSshService", () => ({
	executeSshCommand: jest.fn(),
}));

const mockedExecuteSshCommand = executeSshCommand as jest.MockedFunction<
	typeof executeSshCommand
>;

describe("remoteRootHealthService", () => {
	const connection: RemoteRootConnection = {
		host: "203.0.113.10",
		port: 22,
		user: "root",
		privateKey: "private-key",
	};

	beforeEach(() => {
		mockedExecuteSshCommand.mockReset();
	});

	it("reads ZeroTier config during health checks and selects the host IP when no endpoint IP was configured", async () => {
		mockedExecuteSshCommand.mockImplementation(async ({ command }) => {
			if (command === "true") {
				return { stdout: "", stderr: "" };
			}
			return {
				stdout: [
					"__ZTNET_INSTALLED__",
					"yes",
					"__ZTNET_SERVICE__",
					"active",
					"__ZTNET_STARTUP__",
					"enabled",
					"__ZTNET_IDENTITY__",
					"992fcf1db7:0:206ed59350b31916f749a1f85dffb3a8787dcbf83b8c6e9448d4e3ea0e3369301be716c3609344a9d1533850fb4460c50af43322bcfc8e13d3301a1f1003ceb6",
					"__ZTNET_INFO__",
					"200 info 992fcf1db7 1.14.2 ONLINE",
					"__ZTNET_LOCAL_CONF__",
					'{"settings":{"primaryPort":10001}}',
					"__ZTNET_INTERFACE_IPS__",
					"10.0.0.8",
					"__ZTNET_PUBLIC_IPS__",
					"203.0.113.20",
					"__ZTNET_PLANET__",
					"planet abc123",
				].join("\n"),
				stderr: "",
			};
		});

		const result = await checkRemoteRootHealth({
			connection,
			endpointSource: "MANUAL_IP",
			selectedIp: null,
			checkPanelEndpoint: jest.fn().mockResolvedValue({ ok: true }),
		});

		expect(result.status).toBe("HEALTHY");
		expect(result.sshStatus).toBe("OK");
		expect(result.panelStatus).toBe("OK");
		expect(result.startupStatus).toBe("ENABLED");
		expect(result.primaryPort).toBe(10001);
		expect(result.selectedIp).toBe("203.0.113.20");
		expect(result.endpointCandidates).toEqual([
			{ ip: "10.0.0.8", source: "INTERFACE_IP", port: 10001 },
			{ ip: "203.0.113.20", source: "PUBLIC_IP", port: 10001 },
			{ ip: "203.0.113.10", source: "SSH_HOST", port: 10001 },
		]);
		expect(result.lastError).toBeNull();
		expect(mockedExecuteSshCommand).toHaveBeenCalledTimes(2);
	});

	it("checks every selected endpoint and reports degraded panel status when only some endpoints pass", async () => {
		mockedExecuteSshCommand.mockImplementation(async ({ command }) => {
			if (command === "true") {
				return { stdout: "", stderr: "" };
			}
			return {
				stdout: [
					"__ZTNET_INSTALLED__",
					"yes",
					"__ZTNET_SERVICE__",
					"active",
					"__ZTNET_STARTUP__",
					"disabled",
					"__ZTNET_IDENTITY__",
					"992fcf1db7:0:206ed59350b31916f749a1f85dffb3a8787dcbf83b8c6e9448d4e3ea0e3369301be716c3609344a9d1533850fb4460c50af43322bcfc8e13d3301a1f1003ceb6",
					"__ZTNET_INFO__",
					"200 info 992fcf1db7 1.16.2 ONLINE",
					"__ZTNET_LOCAL_CONF__",
					'{"settings":{"primaryPort":9993}}',
					"__ZTNET_INTERFACE_IPS__",
					"10.0.0.8",
					"__ZTNET_PUBLIC_IPS__",
					"203.0.113.20",
					"__ZTNET_PLANET__",
					"planet abc123",
				].join("\n"),
				stderr: "",
			};
		});

		const result = await checkRemoteRootHealth({
			connection,
			endpointSource: "MANUAL_IP",
			selectedIps: ["203.0.113.20", "2001:db8::20"],
			checkPanelEndpoint: jest
				.fn()
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "UDP send failed" }),
		});

		expect(result.status).toBe("DEGRADED");
		expect(result.sshStatus).toBe("OK");
		expect(result.panelStatus).toBe("DEGRADED");
		expect(result.sshError).toBeNull();
		expect(result.panelError).toBe("2001:db8::20: UDP send failed");
		expect(result.startupStatus).toBe("DISABLED");
		expect(result.selectedIps).toEqual(["203.0.113.20", "2001:db8::20"]);
	});

	it("reports SSH failure without running a panel endpoint check", async () => {
		mockedExecuteSshCommand.mockRejectedValue(new Error("ssh timed out"));
		const checkPanelEndpoint = jest.fn();

		const result = await checkRemoteRootHealth({
			connection,
			endpointSource: "MANUAL_IP",
			selectedIp: "203.0.113.20",
			selectedIps: ["203.0.113.20"],
			checkPanelEndpoint,
		});

		expect(result.status).toBe("OFFLINE");
		expect(result.sshStatus).toBe("FAILED");
		expect(result.panelStatus).toBe("UNKNOWN");
		expect(result.sshError).toBe("ssh timed out");
		expect(result.panelError).toBeNull();
		expect(checkPanelEndpoint).not.toHaveBeenCalled();
	});
});
