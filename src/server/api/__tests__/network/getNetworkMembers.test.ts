// Use the global `jest` so ts-jest hoists these module mocks above the imports.
jest.mock("~/server/api/services/memberService", () => ({
	reconcileNetworkMembersOnce: jest.fn().mockResolvedValue([]),
	triggerBackgroundReconcile: jest.fn(),
	// passthrough — return the DB rows unchanged so we can assert pagination
	attachLiveStatus: jest.fn((_ctx: unknown, rows: unknown) => Promise.resolve(rows)),
}));
jest.mock("~/utils/ztApi", () => ({
	central_network_and_members: jest.fn(),
}));

import { appRouter } from "../../root";
import * as memberService from "~/server/api/services/memberService";
import * as ztController from "~/utils/ztApi";
import type { Session } from "~/lib/authTypes";

// biome-ignore lint/suspicious/noExplicitAny: test helpers
const svc = memberService as any;
// biome-ignore lint/suspicious/noExplicitAny: test helpers
const zt = ztController as any;

const session = {
	expires: "",
	user: { id: "userid", name: "n", email: "e@e.com" },
} as unknown as Session;

const makeCtx = (over: Record<string, unknown> = {}) => {
	const prisma = {
		network: {
			findUnique: jest
				.fn()
				.mockResolvedValue({ authorId: "userid", organizationId: null }),
		},
		userOrganizationRole: { findFirst: jest.fn() },
		network_members: {
			count: jest.fn(),
			findMany: jest.fn().mockResolvedValue([]),
		},
		...over,
	};
	// biome-ignore lint/suspicious/noExplicitAny: minimal trpc ctx
	return { session, prisma, wss: null, res: null } as any;
};

beforeEach(() => jest.clearAllMocks());

describe("network.getNetworkMembers", () => {
	test("serves a DB page (warm cache) and triggers a background reconcile", async () => {
		const rows = [{ id: "aaa" }, { id: "bbb" }];
		const ctx = makeCtx();
		ctx.prisma.network_members.count
			.mockResolvedValueOnce(5) // cachedCount → warm
			.mockResolvedValueOnce(5) // totalCount
			.mockResolvedValueOnce(3); // authorizedCount
		ctx.prisma.network_members.findMany.mockResolvedValue(rows);

		const caller = appRouter.createCaller(ctx);
		const result = await caller.network.getNetworkMembers({
			nwid: "nw1",
			page: 2,
			pageSize: 10,
			sortBy: "name",
			sortDir: "desc",
		});

		expect(result).toEqual({ members: rows, totalCount: 5, authorizedCount: 3 });
		// Warm cache → background reconcile, never a blocking one.
		expect(svc.triggerBackgroundReconcile).toHaveBeenCalledWith(ctx, "nw1");
		expect(svc.reconcileNetworkMembersOnce).not.toHaveBeenCalled();
		// Pagination + sort translated to SQL.
		const args = ctx.prisma.network_members.findMany.mock.calls[0][0];
		expect(args.skip).toBe(20);
		expect(args.take).toBe(10);
		expect(args.orderBy).toEqual({ name: "desc" });
		expect(args.where).toMatchObject({ nwid: "nw1", deleted: false });
	});

	test("cold cache reconciles synchronously before serving", async () => {
		const ctx = makeCtx();
		ctx.prisma.network_members.count
			.mockResolvedValueOnce(0) // cachedCount → cold
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(0);

		const caller = appRouter.createCaller(ctx);
		await caller.network.getNetworkMembers({ nwid: "nw1" });

		expect(svc.reconcileNetworkMembersOnce).toHaveBeenCalledWith(ctx, "nw1");
		expect(svc.triggerBackgroundReconcile).not.toHaveBeenCalled();
	});

	test("central networks paginate the hosted member list in memory", async () => {
		const ctx = makeCtx();
		zt.central_network_and_members.mockResolvedValue({
			members: [
				{ id: "a", authorized: true },
				{ id: "b", authorized: false },
				{ id: "c", authorized: true },
			],
		});

		const caller = appRouter.createCaller(ctx);
		const result = await caller.network.getNetworkMembers({
			nwid: "nw1",
			central: true,
			page: 0,
			pageSize: 2,
		});

		expect(result.totalCount).toBe(3);
		expect(result.authorizedCount).toBe(2);
		expect(result.members).toHaveLength(2);
		// No DB pagination for central.
		expect(ctx.prisma.network_members.findMany).not.toHaveBeenCalled();
	});
});
