// Use the global `jest` so ts-jest hoists these module mocks above the imports.
jest.mock("~/server/api/services/memberService", () => ({
	reconcileNetworkMembersOnce: jest.fn().mockResolvedValue([]),
	triggerBackgroundReconcile: jest.fn(),
	// passthrough — return the DB rows unchanged so we can assert pagination
	attachLiveStatus: jest.fn((_ctx: unknown, rows: unknown) => Promise.resolve(rows)),
	fetchPeersByAddress: jest.fn(),
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

	test("sync: true reconciles synchronously before serving (REST contract)", async () => {
		const ctx = makeCtx();
		ctx.prisma.network_members.count
			.mockResolvedValueOnce(5) // cachedCount → warm
			.mockResolvedValueOnce(5)
			.mockResolvedValueOnce(3);
		ctx.prisma.network_members.findMany.mockResolvedValue([]);

		const caller = appRouter.createCaller(ctx);
		await caller.network.getNetworkMembers({ nwid: "nw1", sync: true });

		// Even on a warm cache, sync callers get a controller-accurate read.
		expect(svc.reconcileNetworkMembersOnce).toHaveBeenCalledWith(ctx, "nw1");
		expect(svc.triggerBackgroundReconcile).not.toHaveBeenCalled();
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

	describe("sortBy conStatus", () => {
		const NWID = "abcdef0123456789";
		const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);
		// Projection rows the DB returns (id order) and live peers by address.
		const members = [
			{ id: "aaaaaaaaaa", address: "aaaaaaaaaa", lastSeen: minutesAgo(60 * 24 * 300) }, // offline, months
			{ id: "abcdef0123", address: "abcdef0123", lastSeen: minutesAgo(0) }, // controller
			{ id: "bbbbbbbbbb", address: "bbbbbbbbbb", lastSeen: minutesAgo(0) }, // relayed
			{ id: "cccccccccc", address: "cccccccccc", lastSeen: minutesAgo(1) }, // direct LAN
			{ id: "dddddddddd", address: "dddddddddd", lastSeen: minutesAgo(5) }, // offline, minutes
			{ id: "eeeeeeeeee", address: "eeeeeeeeee", lastSeen: minutesAgo(0) }, // direct WAN
		].map((m) => ({ ...m, nwid: NWID }));
		const peers = new Map([
			["bbbbbbbbbb", { latency: -1, versionMajor: -1, paths: [] }],
			[
				"cccccccccc",
				{ latency: 3, versionMajor: 1, paths: [{ address: "192.168.1.5/9993" }] },
			],
			[
				"eeeeeeeeee",
				{ latency: 20, versionMajor: 1, paths: [{ address: "8.8.8.8/9993" }] },
			],
		]);

		const statusCtx = () => {
			const ctx = makeCtx();
			ctx.prisma.network_members.count.mockResolvedValue(members.length);
			ctx.prisma.network_members.findMany.mockImplementation(
				(args: { select?: unknown; where: { id?: { in: string[] } } }) =>
					Promise.resolve(
						args.select
							? members
							: members.filter((m) => args.where.id?.in.includes(m.id)),
					),
			);
			svc.fetchPeersByAddress.mockResolvedValue(peers);
			return ctx;
		};

		test("orders local members by live status, then last seen", async () => {
			const ctx = statusCtx();
			const caller = appRouter.createCaller(ctx);
			const result = await caller.network.getNetworkMembers({
				nwid: NWID,
				pageSize: 50,
				sortBy: "conStatus",
				sortDir: "desc",
			});

			expect(result.members.map((m) => m.id)).toEqual([
				"abcdef0123", // controller
				"eeeeeeeeee", // direct, seen now
				"cccccccccc", // direct, seen 1 min ago
				"bbbbbbbbbb", // relayed
				"dddddddddd", // offline minutes
				"aaaaaaaaaa", // offline months
			]);
			// The served status uses the same controller snapshot as the order.
			expect(svc.attachLiveStatus).toHaveBeenCalledWith(ctx, expect.any(Array), peers);
		});

		test("pages the sorted list instead of sorting each page", async () => {
			const ctx = statusCtx();
			const caller = appRouter.createCaller(ctx);
			const result = await caller.network.getNetworkMembers({
				nwid: NWID,
				page: 1,
				pageSize: 2,
				sortBy: "conStatus",
				sortDir: "asc",
			});

			// asc: aaaaaaaaaa, dddddddddd | bbbbbbbbbb, cccccccccc | eeeeeeeeee, abcdef0123
			expect(result.members.map((m) => m.id)).toEqual(["bbbbbbbbbb", "cccccccccc"]);
			expect(result.totalCount).toBe(members.length);
		});

		test("sorts central members by the five minute last seen window", async () => {
			const ctx = makeCtx();
			const now = Date.now();
			zt.central_network_and_members.mockResolvedValue({
				members: [
					{ id: "old", lastSeen: now - 60 * 60 * 1000 },
					{ id: "online", lastSeen: now - 60 * 1000 },
					{ id: "recent", lastSeen: now - 10 * 60 * 1000 },
				],
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.network.getNetworkMembers({
				nwid: "nw1",
				central: true,
				sortBy: "conStatus",
				sortDir: "desc",
			});

			expect(result.members.map((m) => m.id)).toEqual(["online", "recent", "old"]);
		});
	});
});
