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
	// Version + controller object caches already backfilled (-1 = controller
	// "unknown"); tests opt into the NULL backfill paths explicitly.
	vMajor: -1,
	vMinor: -1,
	vRev: -1,
	vProto: -1,
	controllerConfig: {},
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

	test("caches the controller-reported client version on detail fetch (#984)", async () => {
		ztMock.network_members.mockResolvedValue({ A: 2 });
		ztMock.member_details.mockResolvedValue(
			dbRow("A", { authorized: true, vMajor: 1, vMinor: 14, vRev: 2, vProto: 12 }),
		);
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A", { revision: 1 })])
			.mockResolvedValueOnce([
				dbRow("A", { revision: 2, vMajor: 1, vMinor: 14, vRev: 2, vProto: 12 }),
			]);

		const result = await reconcileNetworkMembers(ctx, nwid);

		const configWrite = dbMock.updateMany.mock.calls[0][0];
		expect(configWrite.where).toEqual({ nwid, id: "A" });
		expect(configWrite.data).toMatchObject({
			vMajor: 1,
			vMinor: 14,
			vRev: 2,
			vProto: 12,
		});
		// The raw controller member object is cached alongside (#983).
		expect(configWrite.data.controllerConfig).toMatchObject({ id: "A" });
		expect(result[0]).toMatchObject({ vMajor: 1, vMinor: 14, vRev: 2, vProto: 12 });
	});

	test("serves documented controller fields from the cached object (#983)", async () => {
		ztMock.network_members.mockResolvedValue({ A: 1 });
		dbMock.findMany.mockResolvedValueOnce([dbRow("A")]).mockResolvedValueOnce([
			dbRow("A", {
				name: "user-set-name",
				controllerConfig: {
					objtype: "member",
					identity: "A:pubkey",
					name: "controller-name",
					tags: [],
					capabilities: [],
					ssoExempt: false,
					lastAuthorizedTime: 123,
				},
			}),
		]);

		const result = await reconcileNetworkMembers(ctx, nwid);

		expect(result[0]).toMatchObject({
			objtype: "member",
			identity: "A:pubkey",
			tags: [],
			capabilities: [],
			ssoExempt: false,
			lastAuthorizedTime: 123,
		});
		// DB-maintained columns win over the cached controller object.
		expect(result[0].name).toBe("user-set-name");
		// The internal cache blob itself is never served.
		expect(result[0]).not.toHaveProperty("controllerConfig");
	});

	test("falls back to the controller name when the DB has none (migration)", async () => {
		// Install migrated from a controller-stored-names setup: the DB row has no
		// name yet, but the cached controller object does. The empty DB value must
		// not mask it (#719).
		ztMock.network_members.mockResolvedValue({ A: 1 });
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A")])
			.mockResolvedValueOnce([
				dbRow("A", { name: null, controllerConfig: { name: "controller-name" } }),
			]);

		const result = await reconcileNetworkMembers(ctx, nwid);

		expect(result[0].name).toBe("controller-name");
	});

	test("backfills rows missing the cached controller object", async () => {
		// Version already cached, revision unchanged — only the raw object is missing.
		ztMock.network_members.mockResolvedValue({ A: 1 });
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A", { controllerConfig: null })])
			.mockResolvedValueOnce([dbRow("A")]);

		await reconcileNetworkMembers(ctx, nwid);

		expect(ztMock.member_details).toHaveBeenCalledWith(ctx, nwid, "A", false);
	});

	test("backfills rows that predate the version cache (vMajor NULL)", async () => {
		// Revision matches, but the row has never had its version fetched.
		ztMock.network_members.mockResolvedValue({ A: 1 });
		ztMock.member_details.mockResolvedValue(
			dbRow("A", { authorized: true, vMajor: 1, vMinor: 14, vRev: 2, vProto: 12 }),
		);
		dbMock.findMany
			.mockResolvedValueOnce([
				dbRow("A", { vMajor: null, vMinor: null, vRev: null, vProto: null }),
			])
			.mockResolvedValueOnce([
				dbRow("A", { vMajor: 1, vMinor: 14, vRev: 2, vProto: 12 }),
			]);

		await reconcileNetworkMembers(ctx, nwid);

		expect(ztMock.member_details).toHaveBeenCalledWith(ctx, nwid, "A", false);
		const configWrite = dbMock.updateMany.mock.calls[0][0];
		expect(configWrite.data).toMatchObject({
			vMajor: 1,
			vMinor: 14,
			vRev: 2,
			vProto: 12,
		});
	});

	test("refreshes the cached version from the live peer while online", async () => {
		// Revision unchanged (a version bump does not touch the member revision),
		// so no detail fetch happens — the live peer is the only fresh source.
		ztMock.network_members.mockResolvedValue({ A: 1 });
		dbMock.findMany
			.mockResolvedValueOnce([dbRow("A", { vMajor: 1, vMinor: 12, vRev: 0 })])
			.mockResolvedValueOnce([dbRow("A", { vMajor: 1, vMinor: 12, vRev: 0 })]);
		ztMock.peers.mockResolvedValue([
			{
				address: "A",
				versionMajor: 1,
				versionMinor: 14,
				versionRev: 2,
				latency: 10,
				paths: [{ address: "10.0.0.1/9993", active: true, preferred: true }],
			},
		]);

		const result = await reconcileNetworkMembers(ctx, nwid);

		expect(ztMock.member_details).not.toHaveBeenCalled();
		const statusWrite = dbMock.updateMany.mock.calls[0][0];
		expect(statusWrite.where).toEqual({ nwid, id: "A" });
		expect(statusWrite.data).toMatchObject({ vMajor: 1, vMinor: 14, vRev: 2 });
		// The peer object carries no protocol version — the cached vProto stays.
		expect(statusWrite.data.vProto).toBeUndefined();
		expect(result[0]).toMatchObject({ vMajor: 1, vMinor: 14, vRev: 2 });
	});
});
