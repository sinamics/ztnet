import { TRPCError } from "@trpc/server";
import {
	assertNetworkFitsOrgMemberCap,
	assertOrgMemberCanBeHidden,
	assertOrgMemberCap,
	assertOrgMemberRestoreFitsCap,
	assertOrgNetworkCanBePublic,
	assertOrgNetworkQuota,
	enforceQuota,
	withOrgNetworkQuota,
} from "~/server/api/services/organizationQuotaService";
import { CustomLimitError } from "~/server/helpers/errorHandler";

/**
 * A minimal stand in for the Prisma client: one organization, one network.
 */
const buildPrisma = ({
	maxNetworks = null as number | null,
	maxMembersPerNetwork = null as number | null,
	networkCount = 0,
	authorizedCount = 0,
	organizationId = "org1" as string | null,
	// biome-ignore lint/suspicious/noExplicitAny: test stub
	member = null as any,
} = {}) => {
	const prisma = {
		organization: {
			findUnique: jest.fn().mockResolvedValue({ maxNetworks, maxMembersPerNetwork }),
		},
		network: {
			count: jest.fn().mockResolvedValue(networkCount),
			findUnique: jest.fn().mockResolvedValue({
				organizationId,
				organization: organizationId ? { maxMembersPerNetwork } : null,
			}),
		},
		network_members: {
			count: jest.fn().mockResolvedValue(authorizedCount),
			findUnique: jest.fn().mockResolvedValue(member),
		},
		$queryRaw: jest.fn().mockResolvedValue([]),
		$transaction: jest.fn(),
	};
	prisma.$transaction.mockImplementation((run) => run(prisma));
	// biome-ignore lint/suspicious/noExplicitAny: test stub
	return prisma as any;
};

describe("assertOrgNetworkQuota", () => {
	it("allows any number of networks when no quota is set", async () => {
		const prisma = buildPrisma({ maxNetworks: null, networkCount: 500 });
		await expect(assertOrgNetworkQuota(prisma, "org1")).resolves.toBeUndefined();
		expect(prisma.network.count).not.toHaveBeenCalled();
	});

	it("allows a network below the quota", async () => {
		const prisma = buildPrisma({ maxNetworks: 3, networkCount: 2 });
		await expect(assertOrgNetworkQuota(prisma, "org1")).resolves.toBeUndefined();
		expect(prisma.network.count).toHaveBeenCalledWith({
			where: { organizationId: "org1" },
		});
	});

	it("refuses a network at the quota and tells the user who to contact", async () => {
		const prisma = buildPrisma({ maxNetworks: 3, networkCount: 3 });
		await expect(assertOrgNetworkQuota(prisma, "org1")).rejects.toThrow(CustomLimitError);
		await expect(assertOrgNetworkQuota(prisma, "org1")).rejects.toThrow(
			/limit of 3 networks.*instance administrator/,
		);
	});

	it("refuses a network when the quota was lowered below the current usage", async () => {
		const prisma = buildPrisma({ maxNetworks: 1, networkCount: 4 });
		await expect(assertOrgNetworkQuota(prisma, "org1")).rejects.toThrow(CustomLimitError);
	});
});

describe("withOrgNetworkQuota", () => {
	it("locks the organization, checks the quota, then adds the network", async () => {
		const prisma = buildPrisma({ maxNetworks: 2, networkCount: 1 });
		const addNetwork = jest.fn().mockResolvedValue("added");

		await expect(withOrgNetworkQuota(prisma, "org1", addNetwork)).resolves.toBe("added");

		expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
		const [sql, lockedId] = prisma.$queryRaw.mock.calls[0];
		expect(sql.join("?")).toContain("FOR UPDATE");
		expect(lockedId).toBe("org1");
		expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
			prisma.network.count.mock.invocationCallOrder[0],
		);
		expect(addNetwork).toHaveBeenCalledWith(prisma);
	});

	it("does not add the network when the quota is used up", async () => {
		const prisma = buildPrisma({ maxNetworks: 2, networkCount: 2 });
		const addNetwork = jest.fn();

		await expect(withOrgNetworkQuota(prisma, "org1", addNetwork)).rejects.toThrow(
			CustomLimitError,
		);
		expect(addNetwork).not.toHaveBeenCalled();
	});
});

describe("assertOrgMemberCap", () => {
	it("ignores personal networks", async () => {
		const prisma = buildPrisma({ organizationId: null, authorizedCount: 99 });
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).resolves.toBeUndefined();
		expect(prisma.network_members.count).not.toHaveBeenCalled();
	});

	it("ignores organizations without a cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: null, authorizedCount: 99 });
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).resolves.toBeUndefined();
	});

	it("counts authorized members that are not deleted", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5, authorizedCount: 4 });
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).resolves.toBeUndefined();
		expect(prisma.network_members.count).toHaveBeenCalledWith({
			where: {
				nwid: "nw1",
				authorized: true,
				deleted: false,
				permanentlyDeleted: false,
			},
		});
	});

	it("refuses to authorize a member at the cap", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 5,
			authorizedCount: 5,
			member: { authorized: false, deleted: false, permanentlyDeleted: false },
		});
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).rejects.toThrow(
			/limit of 5 authorized members.*instance administrator/,
		);
	});

	it("refuses a member that is not in the database yet", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 1, authorizedCount: 1 });
		await expect(assertOrgMemberCap(prisma, "nw1", "new")).rejects.toThrow(
			CustomLimitError,
		);
	});

	it("lets an already authorized member be saved again, even above the cap", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 2,
			authorizedCount: 6,
			member: { authorized: true, deleted: false, permanentlyDeleted: false },
		});
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).resolves.toBeUndefined();
	});

	it("does not treat a stashed member as already counted", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 2,
			authorizedCount: 2,
			member: { authorized: true, deleted: true, permanentlyDeleted: false },
		});
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).rejects.toThrow(
			CustomLimitError,
		);
	});

	it.each([
		{ deleted: true, permanentlyDeleted: false },
		{ deleted: true, permanentlyDeleted: true },
	])("refuses to authorize a hidden member even below the cap (%p)", async (flags) => {
		// A hidden row is not counted, so authorizing it would never use a slot.
		const prisma = buildPrisma({
			maxMembersPerNetwork: 5,
			authorizedCount: 1,
			member: { authorized: false, ...flags },
		});
		await expect(assertOrgMemberCap(prisma, "nw1", "m1")).rejects.toThrow(
			/Restore it before authorizing/,
		);
	});

	it("lets a hidden member be authorized when the same request restores it", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 5,
			authorizedCount: 4,
			member: { authorized: false, deleted: true, permanentlyDeleted: false },
		});
		await expect(
			assertOrgMemberCap(prisma, "nw1", "m1", { restoring: true }),
		).resolves.toBeUndefined();
	});

	it("still checks the count when a restore also authorizes", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 5,
			authorizedCount: 5,
			member: { authorized: false, deleted: true, permanentlyDeleted: false },
		});
		await expect(
			assertOrgMemberCap(prisma, "nw1", "m1", { restoring: true }),
		).rejects.toThrow(/limit of 5 authorized members/);
	});
});

describe("assertOrgMemberRestoreFitsCap", () => {
	const stashed = (authorized: boolean) => ({
		authorized,
		deleted: true,
		permanentlyDeleted: false,
	});

	it("refuses to restore a still authorized member into a full network", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 2,
			authorizedCount: 2,
			member: stashed(true),
		});
		await expect(assertOrgMemberRestoreFitsCap(prisma, "nw1", "m1")).rejects.toThrow(
			/limit of 2 authorized members/,
		);
	});

	it("restores a still authorized member while there is room", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 2,
			authorizedCount: 1,
			member: stashed(true),
		});
		await expect(
			assertOrgMemberRestoreFitsCap(prisma, "nw1", "m1"),
		).resolves.toBeUndefined();
	});

	it("always restores a member that is not authorized", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 2,
			authorizedCount: 9,
			member: stashed(false),
		});
		await expect(
			assertOrgMemberRestoreFitsCap(prisma, "nw1", "m1"),
		).resolves.toBeUndefined();
	});

	it("ignores networks without a cap", async () => {
		const prisma = buildPrisma({ authorizedCount: 9, member: stashed(true) });
		await expect(
			assertOrgMemberRestoreFitsCap(prisma, "nw1", "m1"),
		).resolves.toBeUndefined();
	});
});

describe("assertOrgMemberCanBeHidden", () => {
	const visible = (authorized: boolean) => ({
		authorized,
		deleted: false,
		permanentlyDeleted: false,
	});

	it("refuses to hide a member that is still authorized under a cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 2, member: visible(true) });
		await expect(assertOrgMemberCanBeHidden(prisma, "nw1", "m1")).rejects.toThrow(
			/still authorized/,
		);
	});

	it("hides a deauthorized member", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 2, member: visible(false) });
		await expect(
			assertOrgMemberCanBeHidden(prisma, "nw1", "m1"),
		).resolves.toBeUndefined();
	});

	it("ignores networks without a cap", async () => {
		const prisma = buildPrisma({ member: visible(true) });
		await expect(
			assertOrgMemberCanBeHidden(prisma, "nw1", "m1"),
		).resolves.toBeUndefined();
	});
});

describe("assertOrgNetworkCanBePublic", () => {
	it("allows public networks without a member cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: null });
		await expect(assertOrgNetworkCanBePublic(prisma, "nw1")).resolves.toBeUndefined();
	});

	it("allows personal networks", async () => {
		const prisma = buildPrisma({ organizationId: null });
		await expect(assertOrgNetworkCanBePublic(prisma, "nw1")).resolves.toBeUndefined();
	});

	it("refuses public networks under a member cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 10 });
		await expect(assertOrgNetworkCanBePublic(prisma, "nw1")).rejects.toThrow(
			/cannot be made public/,
		);
	});
});

describe("assertNetworkFitsOrgMemberCap", () => {
	const isPrivate = (value: boolean) => jest.fn().mockResolvedValue(value);

	it("does not ask the controller when the organization has no cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: null });
		const privateCheck = isPrivate(false);
		await assertNetworkFitsOrgMemberCap(prisma, "org1", "nw1", privateCheck);
		expect(privateCheck).not.toHaveBeenCalled();
	});

	it("refuses a public network", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5 });
		await expect(
			assertNetworkFitsOrgMemberCap(prisma, "org1", "nw1", isPrivate(false)),
		).rejects.toThrow(/Make the network private first/);
	});

	it("refuses a network with more authorized members than the cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5, authorizedCount: 6 });
		await expect(
			assertNetworkFitsOrgMemberCap(prisma, "org1", "nw1", isPrivate(true)),
		).rejects.toThrow(/more authorized members/);
	});

	it("accepts a private network that is exactly at the cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5, authorizedCount: 5 });
		await expect(
			assertNetworkFitsOrgMemberCap(prisma, "org1", "nw1", isPrivate(true)),
		).resolves.toBeUndefined();
	});
});

describe("enforceQuota", () => {
	it("turns a limit error into a FORBIDDEN tRPC error with the same message", async () => {
		const error = await enforceQuota(async () => {
			throw new CustomLimitError("limit reached");
		}).catch((e) => e);
		expect(error).toBeInstanceOf(TRPCError);
		expect(error.code).toBe("FORBIDDEN");
		expect(error.message).toBe("limit reached");
	});

	it("passes other errors through untouched", async () => {
		const boom = new Error("boom");
		await expect(
			enforceQuota(async () => {
				throw boom;
			}),
		).rejects.toBe(boom);
	});
});
