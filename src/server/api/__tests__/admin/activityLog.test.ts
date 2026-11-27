/**
 * The instance wide activity log shows every organization's and every personal
 * network's history, so only the instance admin may read it or change how
 * long it is kept.
 */
jest.mock("~/utils/ztApi", () => ({ ZT_FOLDER: "/var/lib/zerotier-one" }));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
	mailTemplateMap: {},
}));
jest.mock("~/server/db", () => ({
	prisma: {
		activityLog: {
			findMany: jest.fn(),
			count: jest.fn(),
			deleteMany: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		globalOptions: { findFirst: jest.fn(), update: jest.fn() },
		organization: { findMany: jest.fn() },
		$transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
	},
}));

import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";
import { pruneActivityLogEntries } from "~/server/api/services/activityLogService";

const findMany = prisma.activityLog.findMany as jest.Mock;
const deleteMany = prisma.activityLog.deleteMany as jest.Mock;
const createLog = prisma.activityLog.create as jest.Mock;
const countLogs = prisma.activityLog.count as jest.Mock;
const updateLog = prisma.activityLog.update as jest.Mock;
const findOrganizations = prisma.organization.findMany as jest.Mock;
const transaction = prisma.$transaction as unknown as jest.Mock;
const findOptions = prisma.globalOptions.findFirst as jest.Mock;
const updateOptions = prisma.globalOptions.update as jest.Mock;
const DAY = 24 * 60 * 60 * 1000;

const callerAs = (role: "ADMIN" | "USER" | null) =>
	appRouter.createCaller({
		session: role ? ({ user: { id: `id-${role}`, role } } as unknown as Session) : null,
		wss: null,
		prisma: prisma as never,
		res: null,
		req: null,
	});

const row = (id: number, createdAt: string) => ({
	id,
	action: `Changed network ${id}`,
	createdAt: new Date(createdAt),
	performedBy: { id: "u1", name: "alice", email: "alice@example.com" },
	organization: null,
});

beforeEach(() => {
	findMany.mockReset().mockResolvedValue([]);
	deleteMany
		.mockReset()
		.mockImplementation(({ where }) => Promise.resolve({ count: where.id.in.length }));
	createLog.mockReset().mockResolvedValue({ id: 77 });
	updateLog.mockReset().mockResolvedValue({});
	findOrganizations.mockReset().mockResolvedValue([]);
	transaction.mockClear();
	countLogs.mockReset().mockResolvedValue(0);
	findOptions.mockReset().mockResolvedValue({ activityLogRetentionDays: null });
	updateOptions
		.mockReset()
		.mockImplementation(({ data }) =>
			Promise.resolve({ activityLogRetentionDays: data.activityLogRetentionDays }),
		);
});

describe("admin.getActivityLog", () => {
	it("is refused for a regular user without reading the log", async () => {
		await expect(callerAs("USER").admin.getActivityLog({})).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		expect(findMany).not.toHaveBeenCalled();
	});

	it("is refused without a session", async () => {
		await expect(callerAs(null).admin.getActivityLog({})).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		expect(findMany).not.toHaveBeenCalled();
	});

	it("returns every row, newest first, with only the needed user fields", async () => {
		await callerAs("ADMIN").admin.getActivityLog({});

		const args = findMany.mock.calls[0][0];
		expect(
			args.where.AND.every((condition: object) => !Object.keys(condition).length),
		).toBe(true);
		expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
		expect(args.take).toBe(26);
		expect(args.select.performedBy).toEqual({
			select: { id: true, name: true, email: true },
		});
	});

	it("filters on personal rows, an organization and a search text", async () => {
		await callerAs("ADMIN").admin.getActivityLog({ organizationId: null });
		expect(findMany.mock.calls[0][0].where.AND).toContainEqual({ organizationId: null });

		await callerAs("ADMIN").admin.getActivityLog({
			organizationId: "org1",
			search: "  alice ",
		});
		const conditions = findMany.mock.calls[1][0].where.AND;
		expect(conditions).toContainEqual({ organizationId: "org1" });
		// the total counts the same filtered rows
		expect(countLogs.mock.calls[1][0].where.AND).toContainEqual({
			organizationId: "org1",
		});
		const search = conditions.find((condition: { OR?: unknown[] }) =>
			condition.OR?.some((part) => "performedBy" in (part as object)),
		);
		expect(search.OR).toContainEqual({
			action: { contains: "alice", mode: "insensitive" },
		});
		expect(search.OR).toContainEqual({
			performedBy: { email: { contains: "alice", mode: "insensitive" } },
		});
	});

	it("filters on a user, a date range and an action type", async () => {
		const from = new Date("2026-11-01T00:00:00Z");
		const to = new Date("2026-11-08T00:00:00Z");
		await callerAs("ADMIN").admin.getActivityLog({
			userId: "u1",
			from,
			to,
			actionType: "NETWORK",
		});

		const conditions = findMany.mock.calls[0][0].where.AND;
		expect(conditions).toContainEqual({ performedById: "u1" });
		expect(conditions).toContainEqual({ createdAt: { gte: from, lt: to } });
		// member changes mention their network too, they are not network changes
		expect(conditions).toContainEqual({
			action: { contains: "network", mode: "insensitive" },
			NOT: { action: { contains: "member", mode: "insensitive" } },
		});
	});

	it("rejects an unknown action type", async () => {
		await expect(
			callerAs("ADMIN").admin.getActivityLog({ actionType: "USER" as never }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(findMany).not.toHaveBeenCalled();
	});

	it("pages by cursor and only offers a next page when there is one", async () => {
		findMany.mockResolvedValue([
			row(3, "2026-11-27T10:00:00Z"),
			row(2, "2026-11-27T09:00:00Z"),
			row(1, "2026-11-27T08:00:00Z"),
		]);

		countLogs.mockResolvedValue(3);
		const first = await callerAs("ADMIN").admin.getActivityLog({ pageSize: 2 });
		expect(first.total).toBe(3);
		expect(first.logs.map((log) => log.id)).toEqual([3, 2]);
		expect(first.nextCursor).toEqual({
			createdAt: new Date("2026-11-27T09:00:00Z"),
			id: 2,
		});

		findMany.mockResolvedValue([row(1, "2026-11-27T08:00:00Z")]);
		const second = await callerAs("ADMIN").admin.getActivityLog({
			pageSize: 2,
			cursor: first.nextCursor,
		});
		expect(second.nextCursor).toBeNull();
		// the total counts every page, so it ignores the cursor
		expect(countLogs.mock.calls[1][0].where.AND).not.toContainEqual(
			findMany.mock.calls[1][0].where.AND.at(-1),
		);
		expect(findMany.mock.calls[1][0].where.AND).toContainEqual({
			OR: [
				{ createdAt: { lt: new Date("2026-11-27T09:00:00Z") } },
				{ createdAt: new Date("2026-11-27T09:00:00Z"), id: { lt: 2 } },
			],
		});
	});
});

describe("admin.updateActivityLogSettings", () => {
	it("is refused for a regular user without changing or deleting anything", async () => {
		await expect(
			callerAs("USER").admin.updateActivityLogSettings({ retentionDays: 1 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(updateOptions).not.toHaveBeenCalled();
		expect(findMany).not.toHaveBeenCalled();
		expect(deleteMany).not.toHaveBeenCalled();
		expect(createLog).not.toHaveBeenCalled();
	});

	it.each([0, 3651, 1.5])("rejects a retention of %s days", async (retentionDays) => {
		await expect(
			callerAs("ADMIN").admin.updateActivityLogSettings({ retentionDays }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(updateOptions).not.toHaveBeenCalled();
		expect(createLog).not.toHaveBeenCalled();
	});

	it("commits the setting with its audit entry, then prunes and adds the count", async () => {
		findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
		const before = Date.now();

		const result = await callerAs("ADMIN").admin.updateActivityLogSettings({
			retentionDays: 30,
		});

		expect(result).toEqual({ retentionDays: 30, deleted: 2 });
		// setting and audit entry go through one transaction, before any delete
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(updateOptions.mock.calls[0][0].data).toEqual({ activityLogRetentionDays: 30 });
		expect(createLog.mock.calls[0][0].data).toEqual({
			action: "Set activity log retention to 30 days",
			performedById: "id-ADMIN",
		});
		expect(createLog.mock.invocationCallOrder[0]).toBeLessThan(
			deleteMany.mock.invocationCallOrder[0],
		);
		const cutoff: Date = findMany.mock.calls[0][0].where.createdAt.lt;
		expect(before - cutoff.getTime()).toBeGreaterThanOrEqual(30 * DAY - 1000);
		expect(before - cutoff.getTime()).toBeLessThanOrEqual(30 * DAY + 1000);
		expect(updateLog).toHaveBeenCalledWith({
			where: { id: 77 },
			data: { action: "Set activity log retention to 30 days, deleted 2 older entries" },
		});
	});

	it("keeps the audit entry when the prune fails", async () => {
		findMany.mockResolvedValueOnce([{ id: 1 }]);
		deleteMany.mockRejectedValueOnce(new Error("could not extend file: disk full"));

		await expect(
			callerAs("ADMIN").admin.updateActivityLogSettings({ retentionDays: 7 }),
		).rejects.toThrow();

		// the setting and the entry naming who changed it were committed first
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(updateOptions.mock.calls[0][0].data).toEqual({ activityLogRetentionDays: 7 });
		expect(createLog.mock.calls[0][0].data).toEqual({
			action: "Set activity log retention to 7 days",
			performedById: "id-ADMIN",
		});
		expect(createLog.mock.invocationCallOrder[0]).toBeLessThan(
			deleteMany.mock.invocationCallOrder[0],
		);
		expect(updateLog).not.toHaveBeenCalled();
	});

	it("keeps every row when the retention is cleared, and logs that", async () => {
		const result = await callerAs("ADMIN").admin.updateActivityLogSettings({
			retentionDays: null,
		});

		expect(updateOptions.mock.calls[0][0].data).toEqual({
			activityLogRetentionDays: null,
		});
		expect(result).toEqual({ retentionDays: null, deleted: 0 });
		expect(deleteMany).not.toHaveBeenCalled();
		expect(updateLog).not.toHaveBeenCalled();
		expect(createLog.mock.calls[0][0].data.action).toBe(
			"Set activity log retention to keep every entry",
		);
	});
});

describe("admin.getActivityLogOrganizations", () => {
	it("is refused for a regular user", async () => {
		await expect(
			callerAs("USER").admin.getActivityLogOrganizations(),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(findOrganizations).not.toHaveBeenCalled();
	});

	it("lists only the id and name of every organization", async () => {
		findOrganizations.mockResolvedValue([{ id: "org1", orgName: "Acme" }]);

		const organizations = await callerAs("ADMIN").admin.getActivityLogOrganizations();

		expect(organizations).toEqual([{ id: "org1", orgName: "Acme" }]);
		expect(findOrganizations).toHaveBeenCalledWith({
			select: { id: true, orgName: true },
			orderBy: { orgName: "asc" },
		});
	});
});

describe("pruneActivityLogEntries", () => {
	const now = new Date("2026-11-27T12:00:00Z");

	it("deletes nothing while no retention is set", async () => {
		expect(await pruneActivityLogEntries(now)).toBe(0);
		expect(findMany).not.toHaveBeenCalled();
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("deletes rows older than the saved retention, oldest first, in batches", async () => {
		findOptions.mockResolvedValue({ activityLogRetentionDays: 7 });
		findMany
			.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
			.mockResolvedValueOnce([{ id: 3 }, { id: 4 }])
			.mockResolvedValueOnce([{ id: 5 }]);

		expect(await pruneActivityLogEntries(now, undefined, 2)).toBe(5);

		expect(findMany).toHaveBeenCalledTimes(3);
		expect(findMany.mock.calls[0][0]).toMatchObject({
			where: { createdAt: { lt: new Date("2026-11-20T12:00:00Z") } },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: 2,
		});
		expect(deleteMany.mock.calls.map(([args]) => args.where.id.in)).toEqual([
			[1, 2],
			[3, 4],
			[5],
		]);
	});

	it("stops when a full batch is followed by an empty one", async () => {
		findOptions.mockResolvedValue({ activityLogRetentionDays: 7 });
		findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]).mockResolvedValueOnce([]);

		expect(await pruneActivityLogEntries(now, undefined, 2)).toBe(2);
		expect(deleteMany).toHaveBeenCalledTimes(1);
	});
});
