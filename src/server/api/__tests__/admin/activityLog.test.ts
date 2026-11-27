/**
 * The instance wide activity log shows every organization's and every personal
 * network's history, so only the instance admin may read it.
 */
jest.mock("~/utils/ztApi", () => ({ ZT_FOLDER: "/var/lib/zerotier-one" }));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
	mailTemplateMap: {},
}));
jest.mock("~/server/db", () => ({
	prisma: { activityLog: { findMany: jest.fn() } },
}));

import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";

const findMany = prisma.activityLog.findMany as jest.Mock;

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

		const first = await callerAs("ADMIN").admin.getActivityLog({ pageSize: 2 });
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
		expect(findMany.mock.calls[1][0].where.AND).toContainEqual({
			OR: [
				{ createdAt: { lt: new Date("2026-11-27T09:00:00Z") } },
				{ createdAt: new Date("2026-11-27T09:00:00Z"), id: { lt: 2 } },
			],
		});
	});
});
