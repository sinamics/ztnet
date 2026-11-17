/**
 * Admins can switch personal networks off globally. Local networks are then
 * refused before anything reaches the controller, while ZeroTier Central
 * networks are not affected.
 */
jest.mock("~/utils/ztApi", () => ({
	network_create: jest.fn(),
}));

import * as ztController from "~/utils/ztApi";
import { networkProvisioningFactory } from "~/server/api/services/networkService";

const networkCreate = ztController.network_create as jest.Mock;

// Minimal prisma context: no user group, no networks yet.
function makeCtx(enablePersonalNetworks: boolean) {
	return {
		session: { user: { id: "user-1" } },
		prisma: {
			globalOptions: {
				findFirst: jest.fn().mockResolvedValue({ enablePersonalNetworks }),
			},
			user: {
				findUnique: jest.fn().mockResolvedValue({ userGroup: null }),
				update: jest.fn().mockResolvedValue({ network: [] }),
			},
			network: {
				count: jest.fn().mockResolvedValue(0),
				findMany: jest.fn().mockResolvedValue([]),
			},
		},
	};
}

describe("networkProvisioningFactory with the personal network switch", () => {
	beforeEach(() => {
		networkCreate.mockResolvedValue({ nwid: "abcdef0123456789", name: "nw" });
	});

	test("blocks a local network when personal networks are disabled", async () => {
		const ctx = makeCtx(false);

		await expect(
			networkProvisioningFactory({ ctx, input: { central: false } }),
		).rejects.toThrow("Personal networks are disabled");
		expect(networkCreate).not.toHaveBeenCalled();
		expect(ctx.prisma.user.update).not.toHaveBeenCalled();
	});

	test("creates a local network when personal networks are enabled", async () => {
		const ctx = makeCtx(true);

		await networkProvisioningFactory({ ctx, input: { central: false } });
		expect(networkCreate).toHaveBeenCalledTimes(1);
		expect(ctx.prisma.user.update).toHaveBeenCalledTimes(1);
	});

	test("still creates a ZeroTier Central network when personal networks are disabled", async () => {
		const ctx = makeCtx(false);

		await networkProvisioningFactory({ ctx, input: { central: true } });
		expect(ctx.prisma.globalOptions.findFirst).not.toHaveBeenCalled();
		expect(networkCreate).toHaveBeenCalledTimes(1);
	});
});
