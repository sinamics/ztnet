/**
 * Organization quotas, checked at every place that enforces them: creating a
 * network, transferring one in, authorizing a member, making a network public,
 * and the instance admin setter.
 */
jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
	mailTemplateMap: {},
}));
jest.mock("~/utils/webhook", () => ({ sendWebhook: jest.fn() }));
jest.mock("~/utils/organizationNotifications", () => ({
	sendOrganizationAdminNotification: jest.fn(),
}));
jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/var/lib/zerotier-one",
	network_create: jest.fn(),
	network_delete: jest.fn(),
	network_update: jest.fn(),
	get_network: jest.fn(),
	member_update: jest.fn(),
}));

import { appRouter } from "~/server/api/root";
import type { Session } from "~/lib/authTypes";
import * as ztController from "~/utils/ztApi";

const ORG = "org1";
const NWID = "aaaaaaaaaaaaaaaa";
const MEMBER = "bbbbbbbbbb";
const OTHER_NWID = "cccccccccccccccc";

type State = {
	maxNetworks: number | null;
	maxMembersPerNetwork: number | null;
	/** Values returned by successive network.count calls (the last one repeats). */
	networkCounts: number[];
	authorizedCount: number;
	networkOrganizationId: string | null;
	member: { authorized: boolean; deleted: boolean; permanentlyDeleted: boolean } | null;
	orgRole: string | null;
};

const buildPrisma = (overrides: Partial<State> = {}) => {
	const state: State = {
		maxNetworks: null,
		maxMembersPerNetwork: null,
		networkCounts: [0],
		authorizedCount: 0,
		networkOrganizationId: ORG,
		member: null,
		orgRole: "ADMIN",
		...overrides,
	};
	const counts = [...state.networkCounts];
	const prisma = {
		userOrganizationRole: {
			findFirst: jest
				.fn()
				.mockImplementation(() =>
					Promise.resolve(state.orgRole ? { role: state.orgRole } : null),
				),
		},
		activityLog: { create: jest.fn().mockResolvedValue({}) },
		userOptions: { findFirst: jest.fn().mockResolvedValue(null) },
		organizationSettings: {
			upsert: jest.fn().mockResolvedValue({ renameNodeGlobally: true }),
		},
		organization: {
			findUnique: jest.fn().mockImplementation(() =>
				Promise.resolve({
					id: ORG,
					maxNetworks: state.maxNetworks,
					maxMembersPerNetwork: state.maxMembersPerNetwork,
					networks: [{ nwid: NWID, name: "net" }],
				}),
			),
			update: jest.fn().mockImplementation(({ data }) =>
				Promise.resolve({
					id: ORG,
					maxNetworks: state.maxNetworks,
					maxMembersPerNetwork: state.maxMembersPerNetwork,
					...data,
				}),
			),
		},
		network: {
			count: jest
				.fn()
				.mockImplementation(() =>
					Promise.resolve(counts.length > 1 ? counts.shift() : counts[0]),
				),
			findMany: jest.fn().mockResolvedValue([]),
			findFirst: jest.fn().mockResolvedValue({ nwid: NWID }),
			findUnique: jest.fn().mockImplementation(() =>
				Promise.resolve({
					name: "net",
					authorId: state.networkOrganizationId ? null : "user-1",
					organizationId: state.networkOrganizationId,
					organization: state.networkOrganizationId
						? { maxMembersPerNetwork: state.maxMembersPerNetwork }
						: null,
				}),
			),
			update: jest.fn().mockResolvedValue({}),
			delete: jest.fn(),
			deleteMany: jest.fn(),
		},
		network_members: {
			count: jest.fn().mockImplementation(() => Promise.resolve(state.authorizedCount)),
			findUnique: jest.fn().mockImplementation(() => Promise.resolve(state.member)),
			// Other organization networks the member is in (global rename)
			findMany: jest.fn().mockResolvedValue([{ nwid: OTHER_NWID }]),
			update: jest.fn().mockResolvedValue({}),
			updateMany: jest.fn(),
			delete: jest.fn(),
			deleteMany: jest.fn(),
		},
		$queryRaw: jest.fn().mockResolvedValue([]),
		$transaction: jest.fn(),
	};
	prisma.$transaction.mockImplementation((run) => run(prisma));
	return prisma;
};

const callerFor = (
	prisma: ReturnType<typeof buildPrisma>,
	instanceRole: "ADMIN" | "USER" = "USER",
) =>
	appRouter.createCaller({
		session: {
			user: { id: "user-1", role: instanceRole, email: "u@example.com", name: "User" },
		} as unknown as Session,
		wss: null,
		prisma: prisma as never,
		res: null,
		req: null,
	});

const networkCreate = ztController.network_create as jest.Mock;
const networkDelete = ztController.network_delete as jest.Mock;
const networkUpdate = ztController.network_update as jest.Mock;
const getNetwork = ztController.get_network as jest.Mock;
const memberUpdate = ztController.member_update as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	networkCreate.mockResolvedValue({ nwid: NWID, id: NWID, name: "net" });
	networkDelete.mockResolvedValue({ status: 200 });
	networkUpdate.mockResolvedValue({ nwid: NWID, private: false });
	getNetwork.mockResolvedValue({ nwid: NWID, private: true });
	memberUpdate.mockResolvedValue({ id: MEMBER, authorized: true });
});

describe("createOrgNetwork network quota", () => {
	it("creates a network when no quota is set", async () => {
		const prisma = buildPrisma({ networkCounts: [50] });
		await callerFor(prisma).org.createOrgNetwork({ organizationId: ORG });
		expect(networkCreate).toHaveBeenCalledTimes(1);
		expect(prisma.organization.update).toHaveBeenCalledTimes(1);
	});

	it("creates a network below the quota", async () => {
		const prisma = buildPrisma({ maxNetworks: 2, networkCounts: [1] });
		await callerFor(prisma).org.createOrgNetwork({ organizationId: ORG });
		expect(networkCreate).toHaveBeenCalledTimes(1);
		expect(prisma.organization.update).toHaveBeenCalledTimes(1);
	});

	it("refuses at the quota before touching the controller", async () => {
		const prisma = buildPrisma({ maxNetworks: 2, networkCounts: [2] });
		await expect(
			callerFor(prisma).org.createOrgNetwork({ organizationId: ORG }),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("instance administrator"),
		});
		expect(networkCreate).not.toHaveBeenCalled();
		expect(prisma.organization.update).not.toHaveBeenCalled();
	});

	it("refuses when the quota was lowered below the usage, and removes nothing", async () => {
		const prisma = buildPrisma({ maxNetworks: 1, networkCounts: [3] });
		await expect(
			callerFor(prisma).org.createOrgNetwork({ organizationId: ORG }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(networkDelete).not.toHaveBeenCalled();
		expect(prisma.network.delete).not.toHaveBeenCalled();
		expect(prisma.network.deleteMany).not.toHaveBeenCalled();
	});

	it("rolls back the controller network when a concurrent request took the last slot", async () => {
		// First count (early check) sees room, the count under the lock does not.
		const prisma = buildPrisma({ maxNetworks: 2, networkCounts: [1, 2] });
		await expect(
			callerFor(prisma).org.createOrgNetwork({ organizationId: ORG }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(networkCreate).toHaveBeenCalledTimes(1);
		expect(prisma.organization.update).not.toHaveBeenCalled();
		expect(networkDelete).toHaveBeenCalledWith(expect.anything(), NWID);
	});
});

describe("transferNetworkOwnership quotas", () => {
	const transfer = (prisma: ReturnType<typeof buildPrisma>) =>
		callerFor(prisma).org.transferNetworkOwnership({ organizationId: ORG, nwid: NWID });

	it("moves the network when no quota is set", async () => {
		const prisma = buildPrisma({ networkCounts: [9] });
		await transfer(prisma);
		expect(prisma.network.update).toHaveBeenCalledWith({
			where: { nwid: NWID, authorId: "user-1" },
			data: { organizationId: ORG, authorId: null },
		});
	});

	it("refuses when the organization network quota is used up", async () => {
		const prisma = buildPrisma({ maxNetworks: 1, networkCounts: [1] });
		await expect(transfer(prisma)).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("limit of 1 networks"),
		});
		expect(prisma.network.update).not.toHaveBeenCalled();
	});

	it("refuses a public network when the organization has a member cap", async () => {
		getNetwork.mockResolvedValue({ nwid: NWID, private: false });
		const prisma = buildPrisma({ maxMembersPerNetwork: 5 });
		await expect(transfer(prisma)).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("Make the network private first"),
		});
		expect(prisma.network.update).not.toHaveBeenCalled();
	});

	it("refuses a network with more authorized members than the cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5, authorizedCount: 6 });
		await expect(transfer(prisma)).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(prisma.network.update).not.toHaveBeenCalled();
	});

	it("refuses a network the caller does not own", async () => {
		const prisma = buildPrisma();
		prisma.network.findFirst.mockResolvedValue(null);
		await expect(transfer(prisma)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(prisma.network.update).not.toHaveBeenCalled();
	});
});

describe("networkMember.Update member cap", () => {
	const update = (
		prisma: ReturnType<typeof buildPrisma>,
		updateParams: { authorized?: boolean; name?: string },
	) =>
		callerFor(prisma).networkMember.Update({
			nwid: NWID,
			memberId: MEMBER,
			organizationId: ORG,
			updateParams,
		});

	it("authorizes a member when no cap is set", async () => {
		const prisma = buildPrisma({ authorizedCount: 100 });
		await update(prisma, { authorized: true });
		expect(memberUpdate).toHaveBeenCalledTimes(1);
	});

	it("authorizes a member below the cap", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 3, authorizedCount: 2 });
		await update(prisma, { authorized: true });
		expect(memberUpdate).toHaveBeenCalledTimes(1);
	});

	it("refuses to authorize a member at the cap", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 3,
			authorizedCount: 3,
			member: { authorized: false, deleted: false, permanentlyDeleted: false },
		});
		await expect(update(prisma, { authorized: true })).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("instance administrator"),
		});
		expect(memberUpdate).not.toHaveBeenCalled();
		expect(prisma.network_members.update).not.toHaveBeenCalled();
	});

	it("still saves an already authorized member when the cap was lowered below usage", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 1,
			authorizedCount: 4,
			member: { authorized: true, deleted: false, permanentlyDeleted: false },
		});
		await update(prisma, { authorized: true });
		expect(memberUpdate).toHaveBeenCalledTimes(1);
	});

	it("a global rename carries only the name into the other networks", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 5,
			authorizedCount: 1,
			member: { authorized: false, deleted: false, permanentlyDeleted: false },
		});
		await update(prisma, { authorized: true, name: "renamed" });
		// The other network gets the name, never the authorization.
		expect(memberUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ nwid: OTHER_NWID, updateParams: { name: "renamed" } }),
		);
		expect(memberUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				nwid: NWID,
				updateParams: { authorized: true, name: "renamed" },
			}),
		);
	});

	it("never blocks deauthorizing or renaming at the cap", async () => {
		const prisma = buildPrisma({
			maxMembersPerNetwork: 1,
			authorizedCount: 4,
			member: { authorized: false, deleted: false, permanentlyDeleted: false },
		});
		await update(prisma, { authorized: false });
		expect(memberUpdate).toHaveBeenCalledTimes(1);
		await update(prisma, { name: "renamed" });
		// the edited network plus one other network for the global rename
		expect(memberUpdate).toHaveBeenCalledTimes(3);
	});

	it("does not apply to personal networks", async () => {
		const prisma = buildPrisma({
			networkOrganizationId: null,
			maxMembersPerNetwork: 1,
			authorizedCount: 9,
		});
		await callerFor(prisma).networkMember.Update({
			nwid: NWID,
			memberId: MEMBER,
			updateParams: { authorized: true },
		});
		expect(memberUpdate).toHaveBeenCalledTimes(1);
	});
});

describe("privatePublicNetwork under a member cap", () => {
	const setPrivate = (prisma: ReturnType<typeof buildPrisma>, value: boolean) =>
		callerFor(prisma).network.privatePublicNetwork({
			nwid: NWID,
			organizationId: ORG,
			updateParams: { private: value },
		});

	it("refuses to make a capped organization network public", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5 });
		await expect(setPrivate(prisma, false)).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: expect.stringContaining("cannot be made public"),
		});
		expect(networkUpdate).not.toHaveBeenCalled();
	});

	it("allows making it private", async () => {
		const prisma = buildPrisma({ maxMembersPerNetwork: 5 });
		await setPrivate(prisma, true);
		expect(networkUpdate).toHaveBeenCalledTimes(1);
	});

	it("allows public when the organization has no cap", async () => {
		const prisma = buildPrisma();
		await setPrivate(prisma, false);
		expect(networkUpdate).toHaveBeenCalledTimes(1);
	});
});

describe("admin.updateOrganizationQuotas", () => {
	const quotas = { organizationId: ORG, maxNetworks: 5, maxMembersPerNetwork: 10 };

	it("lets the instance admin set both quotas", async () => {
		const prisma = buildPrisma();
		const result = await callerFor(prisma, "ADMIN").admin.updateOrganizationQuotas(
			quotas,
		);
		expect(prisma.organization.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: ORG },
				data: { maxNetworks: 5, maxMembersPerNetwork: 10 },
			}),
		);
		expect(result).toMatchObject({ maxNetworks: 5, maxMembersPerNetwork: 10 });
	});

	it("accepts null for unlimited", async () => {
		const prisma = buildPrisma({ maxNetworks: 5, maxMembersPerNetwork: 10 });
		await callerFor(prisma, "ADMIN").admin.updateOrganizationQuotas({
			organizationId: ORG,
			maxNetworks: null,
			maxMembersPerNetwork: null,
		});
		expect(prisma.organization.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { maxNetworks: null, maxMembersPerNetwork: null },
			}),
		);
		// No cap, so the controller is not asked about public networks.
		expect(getNetwork).not.toHaveBeenCalled();
	});

	it.each([0, -1, 1.5, Number.NaN])("rejects %p as a limit", async (value) => {
		const prisma = buildPrisma();
		await expect(
			callerFor(prisma, "ADMIN").admin.updateOrganizationQuotas({
				...quotas,
				maxNetworks: value,
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(prisma.organization.update).not.toHaveBeenCalled();
	});

	it("rejects an organization owner or admin who is not an instance admin", async () => {
		// orgRole ADMIN: the caller administers the organization, nothing more.
		const prisma = buildPrisma({ orgRole: "ADMIN" });
		await expect(
			callerFor(prisma, "USER").admin.updateOrganizationQuotas(quotas),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			callerFor(prisma, "USER").admin.getOrganizationQuotas(),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(prisma.organization.update).not.toHaveBeenCalled();
	});

	it("lowering below the usage only stores the limit and removes nothing", async () => {
		const prisma = buildPrisma({ networkCounts: [8], authorizedCount: 30 });
		await callerFor(prisma, "ADMIN").admin.updateOrganizationQuotas({
			organizationId: ORG,
			maxNetworks: 1,
			maxMembersPerNetwork: 1,
		});
		expect(prisma.organization.update).toHaveBeenCalledTimes(1);
		expect(networkDelete).not.toHaveBeenCalled();
		expect(memberUpdate).not.toHaveBeenCalled();
		expect(networkUpdate).not.toHaveBeenCalled();
		expect(prisma.network.delete).not.toHaveBeenCalled();
		expect(prisma.network.deleteMany).not.toHaveBeenCalled();
		expect(prisma.network_members.update).not.toHaveBeenCalled();
		expect(prisma.network_members.updateMany).not.toHaveBeenCalled();
		expect(prisma.network_members.delete).not.toHaveBeenCalled();
		expect(prisma.network_members.deleteMany).not.toHaveBeenCalled();
	});

	it("reports existing public networks when a member cap is set, without changing them", async () => {
		getNetwork.mockResolvedValue({ nwid: NWID, private: false });
		const prisma = buildPrisma();
		const result = await callerFor(prisma, "ADMIN").admin.updateOrganizationQuotas(
			quotas,
		);
		expect(result.publicNetworks).toEqual([{ nwid: NWID, name: "net" }]);
		expect(networkUpdate).not.toHaveBeenCalled();
	});
});

describe("organization procedures cannot write quotas", () => {
	it("updateMeta drops quota fields sent by an organization admin", async () => {
		const prisma = buildPrisma();
		await callerFor(prisma).org.updateMeta({
			organizationId: ORG,
			orgName: "New name",
			// @ts-expect-error not part of the input, a client could still send it
			maxNetworks: 999,
			maxMembersPerNetwork: 999,
		});
		expect(prisma.organization.update).toHaveBeenCalledWith({
			where: { id: ORG },
			data: { orgName: "New name", description: undefined },
		});
	});

	it("the only procedure that takes quota fields is the admin one", () => {
		// biome-ignore lint/suspicious/noExplicitAny: walking tRPC internals
		const procedures = appRouter._def.procedures as Record<string, any>;
		const takingQuotas = Object.entries(procedures)
			.filter(([, procedure]) =>
				(procedure._def.inputs ?? []).some((schema) => {
					const shape = schema?.shape ?? schema?._def?.shape;
					const keys = Object.keys(typeof shape === "function" ? shape() : (shape ?? {}));
					return keys.includes("maxMembersPerNetwork");
				}),
			)
			.map(([path]) => path);
		expect(takingQuotas).toEqual(["admin.updateOrganizationQuotas"]);
	});
});
