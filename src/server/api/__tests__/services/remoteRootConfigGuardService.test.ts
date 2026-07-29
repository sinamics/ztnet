import {
	assertRemoteRootConfigEditable,
	assertRemoteRootNativeCommandAllowed,
} from "~/server/api/services/remoteRootConfigGuardService";

describe("remoteRootConfigGuardService", () => {
	it("allows remote config edits after a successful read of an installed ZeroTier node", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: new Date(),
				zerotierInstalled: true,
				deploymentMode: "NATIVE",
			}),
		).not.toThrow();
	});

	it("requires a successful remote config read before saving remote settings", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: null,
				zerotierInstalled: true,
				deploymentMode: "NATIVE",
			}),
		).toThrow(/read remote zerotier config/i);
	});

	it("requires ZeroTier to be installed before saving remote settings", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: new Date(),
				zerotierInstalled: false,
				deploymentMode: "NATIVE",
			}),
		).toThrow(/not installed/i);
	});

	it("allows Docker data changes but blocks native system commands", () => {
		const node = {
			lastReadAt: new Date(),
			zerotierInstalled: true,
			deploymentMode: "DOCKER" as const,
		};

		expect(() => assertRemoteRootConfigEditable(node)).not.toThrow();
		expect(() => assertRemoteRootNativeCommandAllowed(node, "ZeroTier restart")).toThrow(
			/Docker deployments/i,
		);
	});

	it("blocks changes when deployment detection is unsupported", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: new Date(),
				zerotierInstalled: true,
				deploymentMode: "UNSUPPORTED",
			}),
		).toThrow(/not supported/i);
	});
});
