import { assertRemoteRootConfigEditable } from "~/server/api/services/remoteRootConfigGuardService";

describe("remoteRootConfigGuardService", () => {
	it("allows remote config edits after a successful read of an installed ZeroTier node", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: new Date(),
				zerotierInstalled: true,
			}),
		).not.toThrow();
	});

	it("requires a successful remote config read before saving remote settings", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: null,
				zerotierInstalled: true,
			}),
		).toThrow(/read remote zerotier config/i);
	});

	it("requires ZeroTier to be installed before saving remote settings", () => {
		expect(() =>
			assertRemoteRootConfigEditable({
				lastReadAt: new Date(),
				zerotierInstalled: false,
			}),
		).toThrow(/not installed/i);
	});
});
