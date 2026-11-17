/**
 * Who may read the member status log. The events are keyed by node address,
 * so the only thing standing between a user and another network's history is
 * the access check on the network they ask through.
 */
jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/var/lib/zerotier-one",
	peers: jest.fn().mockResolvedValue([]),
}));
jest.mock("~/utils/webhook", () => ({
	sendWebhook: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn().mockResolvedValue(undefined),
	mailTemplateMap: {},
}));

import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";
import { samplerState } from "~/server/api/services/memberStatusLogService";

// biome-ignore lint/suspicious/noExplicitAny: the routers and the service share the prisma singleton; reassign its methods
const db = prisma as any;

const callerAs = (id: string | null, role: "ADMIN" | "USER" = "USER") =>
	appRouter.createCaller({
		session: id ? ({ user: { id, role } } as unknown as Session) : null,
		wss: null,
		prisma: prisma as never,
		res: null,
		req: null,
	});

const event = {
	id: 1,
	address: "aaaaaaaaaa",
	fromStatus: "DIRECT",
	toStatus: "OFFLINE",
	physicalAddress: null,
	createdAt: new Date("2026-11-17T10:00:00Z"),
	memberName: "laptop",
};

const mockEnabled = (enabled: boolean) => {
	db.globalOptions.findFirst = jest.fn().mockResolvedValue({
		memberStatusLogEnabled: enabled,
		memberStatusLogRetentionDays: 30,
		memberStatusLogSampleInterval: 60,
		memberStatusLogConnectionChanges: false,
	});
};
const mockPersonalNetwork = (authorId: string) => {
	db.network.findUnique = jest.fn().mockResolvedValue({ authorId, organizationId: null });
};
const mockOrgNetwork = (organizationId: string) => {
	db.network.findUnique = jest
		.fn()
		.mockResolvedValue({ authorId: "someone-else", organizationId });
};
const mockOrgRole = (role: string | null) => {
	db.userOrganizationRole.findFirst = jest.fn().mockResolvedValue(role ? { role } : null);
};
// The membership check looks the user up before the role.
const mockUserRole = (role: "ADMIN" | "USER") => {
	db.user.findFirst = jest.fn().mockResolvedValue({ id: "u", role });
	db.user.findUnique = jest.fn().mockResolvedValue({ id: "u", role });
};

beforeEach(() => {
	mockEnabled(true);
	mockUserRole("USER");
	db.$queryRaw = jest.fn((sql) =>
		Promise.resolve(sql.sql.includes("COUNT(*)") ? [{ total: 1 }] : [event]),
	);
	db.$executeRaw = jest.fn().mockResolvedValue(0);
	db.network_members.findMany = jest
		.fn()
		.mockResolvedValue([{ id: "aaaaaaaaaa", name: "laptop" }]);
});

describe("network.getMemberStatusEvents", () => {
	test("the owner of a personal network sees its events", async () => {
		mockPersonalNetwork("owner");

		const result = await callerAs("owner").network.getMemberStatusEvents({ nwid: "nw1" });

		expect(result.enabled).toBe(true);
		expect(result.events).toEqual([event]);
		expect(result.total).toBe(1);
		expect(result.members).toEqual([{ id: "aaaaaaaaaa", name: "laptop" }]);
		// scoped to the network that was checked, never to a client supplied list
		expect(db.$queryRaw.mock.calls[0][0].values).toContain("nw1");
	});

	test("selecting a member keeps the member list for the filter", async () => {
		mockPersonalNetwork("owner");

		const result = await callerAs("owner").network.getMemberStatusEvents({
			nwid: "nw1",
			memberId: "aaaaaaaaaa",
		});

		expect(result.members).toEqual([{ id: "aaaaaaaaaa", name: "laptop" }]);
		expect(db.$queryRaw.mock.calls[0][0].values).toEqual(
			expect.arrayContaining(["nw1", "aaaaaaaaaa"]),
		);
	});

	test("another user is rejected and no event is read", async () => {
		mockPersonalNetwork("owner");

		await expect(
			callerAs("attacker").network.getMemberStatusEvents({ nwid: "nw1" }),
		).rejects.toThrow("You do not have access to this network!");
		expect(db.$queryRaw).not.toHaveBeenCalled();
		expect(db.network_members.findMany).not.toHaveBeenCalled();
	});

	test("asking for a single member does not get around the network check", async () => {
		mockPersonalNetwork("owner");

		await expect(
			callerAs("attacker").network.getMemberStatusEvents({
				nwid: "nw1",
				memberId: "aaaaaaaaaa",
			}),
		).rejects.toThrow("You do not have access to this network!");
		expect(db.$queryRaw).not.toHaveBeenCalled();
	});

	test("a read only organization member sees the organization network", async () => {
		mockOrgNetwork("org1");
		mockOrgRole("READ_ONLY");

		const result = await callerAs("org-member").network.getMemberStatusEvents({
			nwid: "nw-org",
		});

		expect(result.events).toEqual([event]);
	});

	test("a user outside the organization is rejected", async () => {
		mockOrgNetwork("org1");
		mockOrgRole(null);

		await expect(
			callerAs("outsider").network.getMemberStatusEvents({ nwid: "nw-org" }),
		).rejects.toThrow();
		expect(db.$queryRaw).not.toHaveBeenCalled();
	});

	test("an unknown network is not found", async () => {
		db.network.findUnique = jest.fn().mockResolvedValue(null);

		await expect(
			callerAs("owner").network.getMemberStatusEvents({ nwid: "missing" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(db.$queryRaw).not.toHaveBeenCalled();
	});

	test("a visitor without a session is rejected", async () => {
		await expect(
			callerAs(null).network.getMemberStatusEvents({ nwid: "nw1" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("a disabled log returns nothing instead of an error", async () => {
		mockEnabled(false);
		mockPersonalNetwork("owner");

		const result = await callerAs("owner").network.getMemberStatusEvents({ nwid: "nw1" });

		expect(result).toEqual({
			enabled: false,
			events: [],
			nextCursor: null,
			total: 0,
			totalIsCapped: false,
			pageSize: 25,
			members: [],
		});
		expect(db.$queryRaw).not.toHaveBeenCalled();
	});

	test("a disabled log still rejects users without access", async () => {
		mockEnabled(false);
		mockPersonalNetwork("owner");

		await expect(
			callerAs("attacker").network.getMemberStatusEvents({ nwid: "nw1" }),
		).rejects.toThrow("You do not have access to this network!");
	});
});

describe("admin member status log procedures", () => {
	const adminOnly = [
		["getMemberStatusLog", {}],
		["getMemberStatusLogNetworks", undefined],
		["updateMemberStatusLogSettings", { enabled: true }],
		["clearMemberStatusLog", undefined],
	] as const;

	test.each(adminOnly)("%s is refused for a regular user", async (name, input) => {
		const caller = callerAs("user", "USER") as unknown as {
			admin: Record<string, (input?: unknown) => Promise<unknown>>;
		};
		await expect(caller.admin[name](input)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	test.each(adminOnly)("%s is refused without a session", async (name, input) => {
		const caller = callerAs(null) as unknown as {
			admin: Record<string, (input?: unknown) => Promise<unknown>>;
		};
		await expect(caller.admin[name](input)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	test("the instance wide view is not scoped to a network", async () => {
		mockUserRole("ADMIN");
		db.network_members.findMany = jest.fn().mockResolvedValue([
			{
				id: "aaaaaaaaaa",
				address: "aaaaaaaaaa",
				name: "laptop",
				nwid: "nw1",
				nwid_ref: { name: "home", organizationId: null },
			},
		]);

		const result = await callerAs("admin", "ADMIN").admin.getMemberStatusLog({});

		expect(result.enabled).toBe(true);
		expect(result.events).toEqual([event]);
		expect(result.members).toEqual({
			aaaaaaaaaa: [
				{ name: "laptop", nwid: "nw1", networkName: "home", organizationId: null },
			],
		});
		expect(db.$queryRaw.mock.calls[0][0].sql).not.toContain("JOIN");
	});

	test("the instance wide view is empty while the log is disabled", async () => {
		mockEnabled(false);
		mockUserRole("ADMIN");

		const result = await callerAs("admin", "ADMIN").admin.getMemberStatusLog({});

		expect(result).toMatchObject({ enabled: false, events: [], total: 0 });
		expect(db.$queryRaw).not.toHaveBeenCalled();
	});

	test("saving settings validates the ranges", async () => {
		mockUserRole("ADMIN");
		const admin = callerAs("admin", "ADMIN").admin;

		await expect(
			admin.updateMemberStatusLogSettings({ sampleInterval: 5 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			admin.updateMemberStatusLogSettings({ retentionDays: 0 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			admin.updateMemberStatusLogSettings({ retentionDays: 366 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("switching Direct/Relay logging starts from a fresh baseline", async () => {
		mockUserRole("ADMIN");
		db.globalOptions.update = jest.fn().mockResolvedValue({});
		db.memberStatusState.deleteMany = jest.fn().mockResolvedValue({ count: 2 });

		await callerAs("admin", "ADMIN").admin.updateMemberStatusLogSettings({
			logConnectionChanges: true,
		});

		expect(db.globalOptions.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ memberStatusLogConnectionChanges: true }),
			}),
		);
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({});
	});

	test("disabling forgets the baseline, a new retention prunes right away", async () => {
		mockUserRole("ADMIN");
		db.globalOptions.update = jest.fn().mockResolvedValue({
			memberStatusLogEnabled: false,
			memberStatusLogRetentionDays: 7,
			memberStatusLogSampleInterval: 60,
		});
		db.memberStatusState.deleteMany = jest.fn().mockResolvedValue({ count: 2 });
		db.memberStatusEvent.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
		const wake = jest.fn();
		samplerState().wake = wake;

		await callerAs("admin", "ADMIN").admin.updateMemberStatusLogSettings({
			enabled: false,
			retentionDays: 7,
		});

		expect(db.globalOptions.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					memberStatusLogEnabled: false,
					memberStatusLogRetentionDays: 7,
					memberStatusLogSampleInterval: undefined,
					memberStatusLogConnectionChanges: undefined,
				},
			}),
		);
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({});
		expect(db.$executeRaw).toHaveBeenCalledTimes(1);
		expect(db.$executeRaw.mock.calls[0][0].sql).toContain(
			'DELETE FROM "MemberStatusEvent"',
		);
		expect(wake).toHaveBeenCalledTimes(1);
		samplerState().wake = undefined;
	});
});
