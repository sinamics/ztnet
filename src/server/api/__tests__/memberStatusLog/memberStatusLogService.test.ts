// NOTE: use the global `jest` (not @jest/globals) so ts-jest hoists `jest.mock`
// above the imports.
jest.mock("~/utils/ztApi", () => ({
	peers: jest.fn(),
}));

import * as ztController from "~/utils/ztApi";
import { prisma } from "~/server/db";
import type { Peers } from "~/types/local/member";
import {
	MEMBER_STATUS_LOG_IDLE_POLL_SECONDS,
	type KnownStatus,
	diffMemberStatuses,
	getTrackedAddresses,
	peerConnectionStatus,
	pruneMemberStatusEvents,
	queryMemberStatusEvents,
	runMemberStatusSampler,
	sampleMemberStatuses,
	samplerState,
} from "~/server/api/services/memberStatusLogService";

// biome-ignore lint/suspicious/noExplicitAny: the service uses the prisma singleton; reassign its methods
const db = prisma as any;
const peersMock = ztController.peers as jest.Mock;

const directPeer = (address: string, ip = "203.0.113.7/9993") =>
	({
		address,
		latency: 12,
		versionMajor: 1,
		paths: [{ address: ip, active: true, preferred: true }],
	}) as unknown as Peers;

const relayPeer = (address: string) =>
	({ address, latency: -1, versionMajor: 1, paths: [] }) as unknown as Peers;

const peerMap = (...peers: Peers[]) =>
	new Map(peers.map((p) => [(p as unknown as { address: string }).address, p]));

const known = (
	entries: Record<string, KnownStatus["status"]>,
	physicalAddress: string | null = null,
) =>
	new Map<string, KnownStatus>(
		Object.entries(entries).map(([address, status]) => [
			address,
			{ status, physicalAddress },
		]),
	);

const mockSettings = (enabled: boolean, retentionDays = 30, sampleInterval = 60) => {
	db.globalOptions.findFirst = jest.fn().mockResolvedValue({
		memberStatusLogEnabled: enabled,
		memberStatusLogRetentionDays: retentionDays,
		memberStatusLogSampleInterval: sampleInterval,
	});
};

beforeEach(() => {
	samplerState().hasBaseline = false;
	peersMock.mockReset().mockResolvedValue([]);
	db.network_members.findMany = jest.fn().mockResolvedValue([]);
	db.memberStatusState.findMany = jest.fn().mockResolvedValue([]);
	db.memberStatusState.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
	db.memberStatusState.createMany = jest.fn().mockResolvedValue({ count: 0 });
	db.memberStatusEvent.createMany = jest.fn().mockResolvedValue({ count: 0 });
	db.memberStatusEvent.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
	db.$transaction = jest.fn().mockResolvedValue([]);
	db.$queryRaw = jest.fn().mockResolvedValue([]);
	mockSettings(true);
});

describe("peerConnectionStatus", () => {
	test("a node missing from the peer list is offline", () => {
		expect(peerConnectionStatus("aaaaaaaaaa", undefined)).toBe("OFFLINE");
	});

	test("a peer without a measured latency is relayed", () => {
		expect(peerConnectionStatus("aaaaaaaaaa", relayPeer("aaaaaaaaaa"))).toBe("RELAY");
	});

	test("LAN and WAN paths are both direct", () => {
		expect(peerConnectionStatus("aaaaaaaaaa", directPeer("aaaaaaaaaa"))).toBe("DIRECT");
		expect(
			peerConnectionStatus("aaaaaaaaaa", directPeer("aaaaaaaaaa", "192.168.1.5/9993")),
		).toBe("DIRECT");
	});
});

describe("diffMemberStatuses", () => {
	test("a node without a stored status gets a baseline and no event", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "bbbbbbbbbb"],
			peerMap(directPeer("aaaaaaaaaa")),
			new Map(),
		);

		expect(diff.transitions).toEqual([]);
		expect(diff.baselines).toEqual([
			{ address: "aaaaaaaaaa", status: "DIRECT", physicalAddress: "203.0.113.7/9993" },
			{ address: "bbbbbbbbbb", status: "OFFLINE", physicalAddress: null },
		]);
	});

	test("an unchanged status produces nothing", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "bbbbbbbbbb"],
			peerMap(directPeer("aaaaaaaaaa")),
			known({ aaaaaaaaaa: "DIRECT", bbbbbbbbbb: "OFFLINE" }),
		);

		expect(diff).toEqual({ transitions: [], baselines: [], stale: [] });
	});

	test("records going offline with the address the node was last seen on", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa"],
			new Map(),
			known({ aaaaaaaaaa: "DIRECT" }, "198.51.100.4/9993"),
		);

		expect(diff.transitions).toEqual([
			{
				address: "aaaaaaaaaa",
				fromStatus: "DIRECT",
				toStatus: "OFFLINE",
				physicalAddress: "198.51.100.4/9993",
			},
		]);
	});

	test("keeps the last known address through relay and on to offline", () => {
		const toRelay = diffMemberStatuses(
			["aaaaaaaaaa"],
			peerMap(relayPeer("aaaaaaaaaa")),
			known({ aaaaaaaaaa: "DIRECT" }, "198.51.100.4/9993"),
		);
		expect(toRelay.transitions[0]).toMatchObject({
			toStatus: "RELAY",
			physicalAddress: "198.51.100.4/9993",
		});

		const toOffline = diffMemberStatuses(
			["aaaaaaaaaa"],
			new Map(),
			known({ aaaaaaaaaa: "RELAY" }, toRelay.transitions[0].physicalAddress),
		);
		expect(toOffline.transitions[0]).toMatchObject({
			fromStatus: "RELAY",
			toStatus: "OFFLINE",
			physicalAddress: "198.51.100.4/9993",
		});
	});

	test("records coming back online, and direct to relay changes", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "bbbbbbbbbb", "cccccccccc"],
			peerMap(
				directPeer("aaaaaaaaaa"),
				relayPeer("bbbbbbbbbb"),
				directPeer("cccccccccc"),
			),
			known({ aaaaaaaaaa: "OFFLINE", bbbbbbbbbb: "DIRECT", cccccccccc: "RELAY" }),
		);

		expect(diff.transitions).toEqual([
			{
				address: "aaaaaaaaaa",
				fromStatus: "OFFLINE",
				toStatus: "DIRECT",
				physicalAddress: "203.0.113.7/9993",
			},
			{
				address: "bbbbbbbbbb",
				fromStatus: "DIRECT",
				toStatus: "RELAY",
				physicalAddress: null,
			},
			{
				address: "cccccccccc",
				fromStatus: "RELAY",
				toStatus: "DIRECT",
				physicalAddress: "203.0.113.7/9993",
			},
		]);
	});

	test("a node that is a member of several networks is only looked at once", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "aaaaaaaaaa"],
			new Map(),
			known({ aaaaaaaaaa: "DIRECT" }),
		);

		expect(diff.transitions).toHaveLength(1);
	});

	test("peers that are not a member of any network are ignored", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa"],
			peerMap(directPeer("aaaaaaaaaa"), directPeer("planet0001")),
			known({ aaaaaaaaaa: "DIRECT" }),
		);

		expect(diff).toEqual({ transitions: [], baselines: [], stale: [] });
	});

	test("stored statuses of nodes that left every network are reported as stale", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa"],
			peerMap(directPeer("aaaaaaaaaa")),
			known({ aaaaaaaaaa: "DIRECT", gone000000: "OFFLINE" }),
		);

		expect(diff.stale).toEqual(["gone000000"]);
		expect(diff.transitions).toEqual([]);
	});
});

describe("getTrackedAddresses", () => {
	test("deduplicates across networks and leaves the controller node out", async () => {
		db.network_members.findMany.mockResolvedValue([
			{ id: "aaaaaaaaaa", address: "aaaaaaaaaa", nwid: "cccccccccc000001" },
			{ id: "aaaaaaaaaa", address: "aaaaaaaaaa", nwid: "cccccccccc000002" },
			// older rows can have an empty address, the id is the node address
			{ id: "bbbbbbbbbb", address: "", nwid: "cccccccccc000001" },
			// the controller as a member of its own network
			{ id: "cccccccccc", address: "cccccccccc", nwid: "cccccccccc000001" },
		]);

		expect(await getTrackedAddresses()).toEqual(["aaaaaaaaaa", "bbbbbbbbbb"]);
		expect(db.network_members.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { deleted: false } }),
		);
	});
});

describe("sampleMemberStatuses", () => {
	const members = [{ id: "aaaaaaaaaa", address: "aaaaaaaaaa", nwid: "cccccccccc000001" }];

	test("makes one peer list call and writes nothing when nothing changed", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([
			{ address: "aaaaaaaaaa", status: "DIRECT", physicalAddress: null },
		]);
		peersMock.mockResolvedValue([directPeer("aaaaaaaaaa")]);

		const result = await sampleMemberStatuses();

		expect(result).toEqual({ tracked: 1, events: 0 });
		expect(peersMock).toHaveBeenCalledTimes(1);
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	test("stores an event and the new baseline when a status changed", async () => {
		const now = new Date("2026-11-17T10:00:00Z");
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([
			{ address: "aaaaaaaaaa", status: "DIRECT", physicalAddress: "198.51.100.4/9993" },
		]);
		peersMock.mockResolvedValue([]);

		const result = await sampleMemberStatuses(now);

		expect(result).toEqual({ tracked: 1, events: 1 });
		expect(db.memberStatusEvent.createMany).toHaveBeenCalledWith({
			data: [
				{
					address: "aaaaaaaaaa",
					fromStatus: "DIRECT",
					toStatus: "OFFLINE",
					physicalAddress: "198.51.100.4/9993",
					createdAt: now,
				},
			],
		});
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({
			where: { address: { in: ["aaaaaaaaaa"] } },
		});
		expect(db.memberStatusState.createMany).toHaveBeenCalledWith({
			data: [
				{
					address: "aaaaaaaaaa",
					status: "OFFLINE",
					physicalAddress: "198.51.100.4/9993",
				},
			],
			skipDuplicates: true,
		});
		expect(db.$transaction).toHaveBeenCalledTimes(1);
	});

	test("the first sample only stores baselines", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		peersMock.mockResolvedValue([directPeer("aaaaaaaaaa")]);

		const result = await sampleMemberStatuses();

		expect(result.events).toBe(0);
		expect(db.memberStatusEvent.createMany).toHaveBeenCalledWith({ data: [] });
		expect(db.memberStatusState.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [
					{
						address: "aaaaaaaaaa",
						status: "DIRECT",
						physicalAddress: "203.0.113.7/9993",
					},
				],
			}),
		);
	});

	test("an unreachable controller is an error, not everybody going offline", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([
			{ address: "aaaaaaaaaa", status: "DIRECT", physicalAddress: null },
		]);
		peersMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

		await expect(sampleMemberStatuses()).rejects.toThrow("ECONNREFUSED");
		expect(db.$transaction).not.toHaveBeenCalled();
	});
});

describe("runMemberStatusSampler", () => {
	test("does not touch the controller or the log while disabled", async () => {
		mockSettings(false);

		const delay = await runMemberStatusSampler();

		expect(delay).toBe(MEMBER_STATUS_LOG_IDLE_POLL_SECONDS);
		expect(peersMock).not.toHaveBeenCalled();
		expect(db.memberStatusState.deleteMany).not.toHaveBeenCalled();
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	test("the first run after a start drops the stored baseline before sampling", async () => {
		mockSettings(true, 30, 45);

		const delay = await runMemberStatusSampler();

		expect(delay).toBe(45);
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({});
		expect(peersMock).toHaveBeenCalledTimes(1);
		expect(samplerState().hasBaseline).toBe(true);

		// later runs compare against the stored baseline
		db.memberStatusState.deleteMany.mockClear();
		await runMemberStatusSampler();
		expect(db.memberStatusState.deleteMany).not.toHaveBeenCalled();
	});

	test("turning the log off forgets the baseline, turning it on starts over", async () => {
		await runMemberStatusSampler();
		expect(samplerState().hasBaseline).toBe(true);

		mockSettings(false);
		db.memberStatusState.deleteMany.mockClear();
		peersMock.mockClear();
		await runMemberStatusSampler();
		expect(samplerState().hasBaseline).toBe(false);
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({});
		expect(peersMock).not.toHaveBeenCalled();

		mockSettings(true);
		db.memberStatusState.deleteMany.mockClear();
		await runMemberStatusSampler();
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({});
		expect(peersMock).toHaveBeenCalledTimes(1);
	});

	test("a failed sample leaves the baseline flag alone", async () => {
		peersMock.mockRejectedValue(new Error("controller down"));

		await expect(runMemberStatusSampler()).rejects.toThrow("controller down");
		expect(samplerState().hasBaseline).toBe(false);
	});

	test("stored settings outside the allowed range are clamped", async () => {
		mockSettings(true, 30, 1);
		expect(await runMemberStatusSampler()).toBe(10);
	});
});

describe("pruneMemberStatusEvents", () => {
	const now = new Date("2026-11-17T12:00:00Z");

	test("deletes events older than the configured retention", async () => {
		mockSettings(true, 7);
		db.memberStatusEvent.deleteMany.mockResolvedValue({ count: 3 });

		expect(await pruneMemberStatusEvents(now)).toBe(3);
		expect(db.memberStatusEvent.deleteMany).toHaveBeenCalledWith({
			where: { createdAt: { lt: new Date("2026-11-10T12:00:00Z") } },
		});
	});

	test("an explicit retention wins over the stored one", async () => {
		mockSettings(true, 7);

		await pruneMemberStatusEvents(now, 1);

		expect(db.memberStatusEvent.deleteMany).toHaveBeenCalledWith({
			where: { createdAt: { lt: new Date("2026-11-16T12:00:00Z") } },
		});
	});

	test("still prunes while the log is disabled", async () => {
		mockSettings(false, 30);

		await pruneMemberStatusEvents(now);

		expect(db.memberStatusEvent.deleteMany).toHaveBeenCalledWith({
			where: { createdAt: { lt: new Date("2026-10-18T12:00:00Z") } },
		});
	});
});

describe("queryMemberStatusEvents", () => {
	const lastQuery = () => {
		const [events, count] = db.$queryRaw.mock.calls.map(([sql]) => sql);
		return { events, count };
	};

	test("a network scoped query joins through network_members", async () => {
		db.$queryRaw
			.mockResolvedValueOnce([{ id: 1, address: "aaaaaaaaaa" }])
			.mockResolvedValueOnce([{ total: 41 }]);

		const result = await queryMemberStatusEvents({ nwid: "nw1", page: 1, pageSize: 20 });

		expect(result).toEqual({
			events: [{ id: 1, address: "aaaaaaaaaa" }],
			total: 41,
			page: 1,
			pageSize: 20,
		});
		const { events, count } = lastQuery();
		for (const query of [events, count]) {
			expect(query.sql).toContain('JOIN "network_members" m');
			// only active members, and only from the moment they joined
			expect(query.sql).toContain('m."deleted" IS NOT TRUE');
			expect(query.sql).toContain('e."createdAt" >= m."creationTime"');
			expect(query.values).toContain("nw1");
		}
		// newest first, second page of 20
		expect(events.sql).toContain('ORDER BY e."createdAt" DESC');
		expect(events.values).toEqual(expect.arrayContaining([20, 20]));
	});

	test("hides direct and relay changes unless asked for", async () => {
		await queryMemberStatusEvents({ nwid: "nw1" });
		expect(lastQuery().events.sql).toContain(
			`(e."fromStatus" = 'OFFLINE' OR e."toStatus" = 'OFFLINE')`,
		);

		db.$queryRaw.mockClear();
		await queryMemberStatusEvents({ nwid: "nw1", includeConnectionChanges: true });
		expect(lastQuery().events.sql).not.toContain("'OFFLINE'");
	});

	test("filters by member and status with bound parameters", async () => {
		await queryMemberStatusEvents({
			nwid: "nw1",
			address: "aaaaaaaaaa",
			status: "RELAY",
			includeConnectionChanges: true,
		});

		const { events } = lastQuery();
		expect(events.sql).toContain('e."address" = ');
		expect(events.sql).toContain('e."toStatus" = ');
		expect(events.values).toEqual(expect.arrayContaining(["nw1", "aaaaaaaaaa", "RELAY"]));
		// nothing user supplied ends up in the SQL text
		expect(events.sql).not.toContain("aaaaaaaaaa");
	});

	test("the instance wide query has no join and escapes the address search", async () => {
		await queryMemberStatusEvents({ addressSearch: "a%_b" });

		const { events } = lastQuery();
		expect(events.sql).not.toContain("JOIN");
		expect(events.values).toContain("%a\\%\\_b%");
	});

	test("caps the page size", async () => {
		const result = await queryMemberStatusEvents({ pageSize: 5000, page: -3 });
		expect(result.pageSize).toBe(100);
		expect(result.page).toBe(0);
	});
});
