// NOTE: use the global `jest` (not @jest/globals) so ts-jest hoists `jest.mock`
// above the imports — otherwise the module mock below would not apply.

// Controller API is namespace-imported by the service, so mock the module.
jest.mock("~/utils/ztApi", () => ({
	network_members: jest.fn(),
	member_details: jest.fn(),
	peers: jest.fn(),
}));

import * as ztController from "~/utils/ztApi";
import { prisma } from "~/server/db";
import { reconcileNetworkMembers } from "~/server/api/services/memberService";

const nwid = "nw123";
const ctx = { session: { user: { id: "user1" } } } as never;

// biome-ignore lint/suspicious/noExplicitAny: test helpers
const ztMock = ztController as any;
// biome-ignore lint/suspicious/noExplicitAny: the service uses the prisma singleton; reassign its methods
const dbMock = prisma.network_members as any;

const dbRow = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	nwid,
	address: id,
	revision: 1,
	online: false,
	deleted: false,
	permanentlyDeleted: false,
	name: "n",
	physicalAddress: null,
	ipAssignments: [],
	notations: [],
	...over,
});

beforeEach(() => {
	dbMock.findMany = jest.fn();
	dbMock.updateMany = jest.fn().mockResolvedValue({ count: 1 });
	dbMock.deleteMany = jest.fn().mockResolvedValue({ count: 1 });
	// Echo the requested id back as the fetched detail (so it matches an existing
	// DB row and avoids the new-member create path unless a test opts into it).
	ztMock.member_details.mockImplementation((_ctx, _nwid, id) =>
		Promise.resolve(
			dbRow(id, { authorized: true, ipAssignments: ["10.0.0.2"], name: "" }),
		),
	);
	ztMock.peers.mockResolvedValue([]);
});

describe("reconcileNetworkMembers — revision-delta sync", () => {
	test("fetches only new/changed members and deletes controller-orphaned rows", async () => {
		// Controller: A unchanged(1), B changed(1->2), C unchanged(5). D is gone.
		ztMock.network_members.mockResolvedValue({ A: 1, B: 2, C: 5 });
		dbMock.findMany
			.mockResolvedValueOnce([
				dbRow("A", { revision: 1 }),
				dbRow("B", { revision: 1 }),
				dbRow("C", { revision: 5 }),
				dbRow("D", { revision: 9 }),
			])
			.mockResolvedValueOnce([dbRow("A"), dbRow("B", { revision: 2 }), dbRow("C")]);

		const result = await reconcileNetworkMembers(ctx, nwid);

		// Only B (revision changed) is fetched — not A or C.
		expect(ztMock.member_details).toHaveBeenCalledTimes(1);
		expect(ztMock.member_details).toHaveBeenCalledWith(ctx, nwid, "B", false);

		// Orphan D (absent from the controller) is removed from the DB.
		expect(dbMock.deleteMany).toHaveBeenCalledWith({
			where: { nwid, id: { in: ["D"] } },
		});

		expect(result.map((m) => m.id).sort()).toEqual(["A", "B", "C"]);
	});

	test("fetches nothing when all revisions match (warm cache)", async () => {
		ztMock.network_members.mockResolvedValue({ A: 1, B: 1 });
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A"), dbRow("B")])
			.mockResolvedValueOnce([dbRow("A"), dbRow("B")]);

		await reconcileNetworkMembers(ctx, nwid);

		expect(ztMock.member_details).not.toHaveBeenCalled();
		expect(dbMock.deleteMany).not.toHaveBeenCalled();
		// No config writes and no status writes (all offline + unchanged).
		expect(dbMock.updateMany).not.toHaveBeenCalled();
	});

	test("refetches every member on a full resync", async () => {
		ztMock.network_members.mockResolvedValue({ A: 1, B: 1 });
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A"), dbRow("B")])
			.mockResolvedValueOnce([dbRow("A"), dbRow("B")]);

		await reconcileNetworkMembers(ctx, nwid, { full: true });

		expect(ztMock.member_details).toHaveBeenCalledTimes(2);
	});

	test("writes status only for members whose online state changed", async () => {
		ztMock.network_members.mockResolvedValue({ A: 1, B: 1 });
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A"), dbRow("B")])
			.mockResolvedValueOnce([
				dbRow("A", { online: false }),
				dbRow("B", { online: false }),
			]);
		// A has a live peer (becomes online); B has none (stays offline).
		ztMock.peers.mockResolvedValue([
			{
				address: "A",
				latency: 10,
				paths: [{ address: "10.0.0.1/9993", active: true, preferred: true }],
			},
		]);

		await reconcileNetworkMembers(ctx, nwid);

		// Exactly one status write — for A (online flipped). B is skipped.
		expect(dbMock.updateMany).toHaveBeenCalledTimes(1);
		const call = dbMock.updateMany.mock.calls[0][0];
		expect(call.where).toEqual({ nwid, id: "A" });
		expect(call.data.online).toBe(true);
	});
});
