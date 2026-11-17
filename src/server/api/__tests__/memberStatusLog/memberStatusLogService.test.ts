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
	MEMBER_STATUS_EVENT_COUNT_CAP,
	PRUNE_BATCH_SIZE,
	diffMemberStatuses,
	getTrackedAddresses,
	isSuspectSample,
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

const mockSettings = (
	enabled: boolean,
	retentionDays = 30,
	sampleInterval = 60,
	connectionChanges = false,
) => {
	db.globalOptions.findFirst = jest.fn().mockResolvedValue({
		memberStatusLogEnabled: enabled,
		memberStatusLogRetentionDays: retentionDays,
		memberStatusLogSampleInterval: sampleInterval,
		memberStatusLogConnectionChanges: connectionChanges,
	});
};

const T0 = new Date("2026-11-17T10:00:00Z");
const T1 = new Date("2026-11-17T10:00:10Z");
const T2 = new Date("2026-11-17T10:00:20Z");

// Runs the diff sample after sample, carrying the stored statuses along the
// way the sampler does.
const run = (
	samples: Array<{ at: Date; peers: Peers[] }>,
	addresses: string[],
	start: Map<string, KnownStatus>,
	logConnectionChanges = false,
) => {
	const stored = new Map(start);
	const events: ReturnType<typeof diffMemberStatuses>["transitions"] = [];
	let stateWrites = 0;
	for (const { at, peers } of samples) {
		const diff = diffMemberStatuses(addresses, peerMap(...peers), stored, {
			now: at,
			logConnectionChanges,
		});
		events.push(...diff.transitions);
		stateWrites += diff.states.length;
		for (const { address, ...row } of diff.states) stored.set(address, row);
	}
	return { events, stored, stateWrites };
};

beforeEach(() => {
	samplerState().hasBaseline = false;
	samplerState().suspectSince = null;
	peersMock.mockReset().mockResolvedValue([]);
	db.network_members.findMany = jest.fn().mockResolvedValue([]);
	db.memberStatusState.findMany = jest.fn().mockResolvedValue([]);
	db.memberStatusState.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
	db.memberStatusState.createMany = jest.fn().mockResolvedValue({ count: 0 });
	db.memberStatusEvent.createMany = jest.fn().mockResolvedValue({ count: 0 });
	db.memberStatusEvent.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
	db.$transaction = jest.fn().mockResolvedValue([]);
	db.$queryRaw = jest.fn().mockResolvedValue([]);
	db.$executeRaw = jest.fn().mockResolvedValue(0);
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
	const off = { now: T0, logConnectionChanges: false };
	const on = { now: T0, logConnectionChanges: true };

	test("a node without a stored status gets a baseline and no event", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "bbbbbbbbbb"],
			peerMap(directPeer("aaaaaaaaaa")),
			new Map(),
			off,
		);

		expect(diff.transitions).toEqual([]);
		expect(diff.states).toEqual([
			{
				address: "aaaaaaaaaa",
				status: "DIRECT",
				physicalAddress: "203.0.113.7/9993",
				pendingStatus: null,
				pendingSince: null,
			},
			{
				address: "bbbbbbbbbb",
				status: "OFFLINE",
				physicalAddress: null,
				pendingStatus: null,
				pendingSince: null,
			},
		]);
	});

	test("an unchanged status produces nothing", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "bbbbbbbbbb"],
			peerMap(directPeer("aaaaaaaaaa")),
			known({ aaaaaaaaaa: "DIRECT", bbbbbbbbbb: "OFFLINE" }),
			off,
		);

		expect(diff).toEqual({ transitions: [], states: [], stale: [] });
	});

	test("a change seen once is only remembered, not logged", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa"],
			new Map(),
			known({ aaaaaaaaaa: "DIRECT" }, "198.51.100.4/9993"),
			off,
		);

		expect(diff.transitions).toEqual([]);
		expect(diff.states).toEqual([
			{
				address: "aaaaaaaaaa",
				status: "DIRECT",
				physicalAddress: "198.51.100.4/9993",
				pendingStatus: "OFFLINE",
				pendingSince: T0,
			},
		]);
	});

	test("the second sample in a row confirms it, dated to the first sighting", () => {
		const { events, stored } = run(
			[
				{ at: T0, peers: [] },
				{ at: T1, peers: [] },
			],
			["aaaaaaaaaa"],
			known({ aaaaaaaaaa: "DIRECT" }, "198.51.100.4/9993"),
		);

		expect(events).toEqual([
			{
				address: "aaaaaaaaaa",
				fromStatus: "DIRECT",
				toStatus: "OFFLINE",
				// the address the node was last seen on
				physicalAddress: "198.51.100.4/9993",
				createdAt: T0,
			},
		]);
		expect(stored.get("aaaaaaaaaa")).toEqual({
			status: "OFFLINE",
			physicalAddress: "198.51.100.4/9993",
			pendingStatus: null,
			pendingSince: null,
		});
	});

	test("a single flapping sample writes no event", () => {
		const { events, stored } = run(
			[
				{ at: T0, peers: [] },
				{ at: T1, peers: [directPeer("aaaaaaaaaa")] },
				{ at: T2, peers: [directPeer("aaaaaaaaaa")] },
			],
			["aaaaaaaaaa"],
			known({ aaaaaaaaaa: "DIRECT" }),
		);

		expect(events).toEqual([]);
		expect(stored.get("aaaaaaaaaa")).toMatchObject({
			status: "DIRECT",
			pendingStatus: null,
		});
	});

	test("a node that keeps flapping every sample never becomes an event", () => {
		const samples = Array.from({ length: 20 }, (_, i) => ({
			at: new Date(T0.getTime() + i * 10000),
			peers: i % 2 === 0 ? [] : [directPeer("aaaaaaaaaa")],
		}));

		expect(run(samples, ["aaaaaaaaaa"], known({ aaaaaaaaaa: "DIRECT" })).events).toEqual(
			[],
		);
	});

	test("coming back online is confirmed the same way", () => {
		const { events } = run(
			[
				{ at: T0, peers: [directPeer("aaaaaaaaaa")] },
				{ at: T1, peers: [directPeer("aaaaaaaaaa")] },
			],
			["aaaaaaaaaa"],
			known({ aaaaaaaaaa: "OFFLINE" }),
		);

		expect(events).toEqual([
			{
				address: "aaaaaaaaaa",
				fromStatus: "OFFLINE",
				toStatus: "DIRECT",
				physicalAddress: "203.0.113.7/9993",
				createdAt: T0,
			},
		]);
	});

	describe("Direct/Relay logging off (default)", () => {
		test("a move between Direct and Relay writes nothing at all", () => {
			const { events, stateWrites } = run(
				[
					{ at: T0, peers: [relayPeer("aaaaaaaaaa")] },
					{ at: T1, peers: [relayPeer("aaaaaaaaaa")] },
					{ at: T2, peers: [directPeer("aaaaaaaaaa")] },
				],
				["aaaaaaaaaa"],
				known({ aaaaaaaaaa: "DIRECT" }),
			);

			expect(events).toEqual([]);
			expect(stateWrites).toBe(0);
		});

		test("going offline by way of Relay is one event from the stored status", () => {
			const { events } = run(
				[
					{ at: T0, peers: [relayPeer("aaaaaaaaaa")] },
					{ at: T1, peers: [] },
					{ at: T2, peers: [] },
				],
				["aaaaaaaaaa"],
				known({ aaaaaaaaaa: "DIRECT" }, "198.51.100.4/9993"),
			);

			expect(events).toEqual([
				{
					address: "aaaaaaaaaa",
					fromStatus: "DIRECT",
					toStatus: "OFFLINE",
					physicalAddress: "198.51.100.4/9993",
					createdAt: T1,
				},
			]);
		});

		test("coming online as Relay first and Direct next still confirms", () => {
			const { events } = run(
				[
					{ at: T0, peers: [relayPeer("aaaaaaaaaa")] },
					{ at: T1, peers: [directPeer("aaaaaaaaaa")] },
				],
				["aaaaaaaaaa"],
				known({ aaaaaaaaaa: "OFFLINE" }),
			);

			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				fromStatus: "OFFLINE",
				toStatus: "DIRECT",
				createdAt: T0,
			});
		});
	});

	describe("Direct/Relay logging on", () => {
		test("a Direct to Relay change is logged after two samples", () => {
			const { events } = run(
				[
					{ at: T0, peers: [relayPeer("aaaaaaaaaa")] },
					{ at: T1, peers: [relayPeer("aaaaaaaaaa")] },
				],
				["aaaaaaaaaa"],
				known({ aaaaaaaaaa: "DIRECT" }, "198.51.100.4/9993"),
				true,
			);

			expect(events).toEqual([
				{
					address: "aaaaaaaaaa",
					fromStatus: "DIRECT",
					toStatus: "RELAY",
					physicalAddress: "198.51.100.4/9993",
					createdAt: T0,
				},
			]);
		});

		test("a different status on the second sample starts the wait over", () => {
			const { events, stored } = run(
				[
					{ at: T0, peers: [relayPeer("aaaaaaaaaa")] },
					{ at: T1, peers: [] },
				],
				["aaaaaaaaaa"],
				known({ aaaaaaaaaa: "DIRECT" }),
				true,
			);

			expect(events).toEqual([]);
			expect(stored.get("aaaaaaaaaa")).toMatchObject({
				status: "DIRECT",
				pendingStatus: "OFFLINE",
				pendingSince: T1,
			});
		});

		test("without the switch the same samples log nothing", () => {
			expect(
				diffMemberStatuses(
					["aaaaaaaaaa"],
					peerMap(relayPeer("aaaaaaaaaa")),
					known({ aaaaaaaaaa: "DIRECT" }),
					off,
				),
			).toEqual({ transitions: [], states: [], stale: [] });
			expect(
				diffMemberStatuses(
					["aaaaaaaaaa"],
					peerMap(relayPeer("aaaaaaaaaa")),
					known({ aaaaaaaaaa: "DIRECT" }),
					on,
				).states,
			).toHaveLength(1);
		});
	});

	test("a confirmed mass drop is dated to the sample that first showed it", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "bbbbbbbbbb"],
			peerMap(directPeer("bbbbbbbbbb")),
			known({ aaaaaaaaaa: "DIRECT", bbbbbbbbbb: "OFFLINE" }),
			{ now: T1, logConnectionChanges: false, offlineSeenSince: T0 },
		);

		expect(diff.transitions).toEqual([
			expect.objectContaining({
				address: "aaaaaaaaaa",
				toStatus: "OFFLINE",
				createdAt: T0,
			}),
		]);
		// it only vouches for nodes going offline, one coming online still waits
		expect(diff.states).toContainEqual(
			expect.objectContaining({
				address: "bbbbbbbbbb",
				status: "OFFLINE",
				pendingStatus: "DIRECT",
			}),
		);
	});

	test("a node that is a member of several networks is only looked at once", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa", "aaaaaaaaaa"],
			new Map(),
			known({ aaaaaaaaaa: "DIRECT" }),
			off,
		);

		expect(diff.states).toHaveLength(1);
	});

	test("peers that are not a member of any network are ignored", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa"],
			peerMap(directPeer("aaaaaaaaaa"), directPeer("planet0001")),
			known({ aaaaaaaaaa: "DIRECT" }),
			off,
		);

		expect(diff).toEqual({ transitions: [], states: [], stale: [] });
	});

	test("stored statuses of nodes that left every network are reported as stale", () => {
		const diff = diffMemberStatuses(
			["aaaaaaaaaa"],
			peerMap(directPeer("aaaaaaaaaa")),
			known({ aaaaaaaaaa: "DIRECT", gone000000: "OFFLINE" }),
			off,
		);

		expect(diff.stale).toEqual(["gone000000"]);
		expect(diff.transitions).toEqual([]);
	});
});

describe("isSuspectSample", () => {
	const nodes = Array.from({ length: 20 }, (_, i) => `node${String(i).padStart(6, "0")}`);
	const allDirect = known(Object.fromEntries(nodes.map((n) => [n, "DIRECT" as const])));
	const root = directPeer("planet0001");

	test("an empty peer list is suspect", () => {
		expect(isSuspectSample(nodes, new Map(), allDirect)).toBe(true);
		expect(
			isSuspectSample(["aaaaaaaaaa"], new Map(), known({ aaaaaaaaaa: "DIRECT" })),
		).toBe(true);
	});

	test("nearly every online node gone at once is suspect", () => {
		const peers = peerMap(root, directPeer(nodes[0]), directPeer(nodes[1]));
		expect(isSuspectSample(nodes, peers, allDirect)).toBe(true);
	});

	test("a normal share of nodes going offline is not", () => {
		const peers = peerMap(root, ...nodes.slice(5).map((n) => directPeer(n)));
		expect(isSuspectSample(nodes, peers, allDirect)).toBe(false);
	});

	test("a small install losing its few nodes is left to the debounce", () => {
		const three = nodes.slice(0, 3);
		expect(
			isSuspectSample(
				three,
				peerMap(root),
				known(Object.fromEntries(three.map((n) => [n, "DIRECT" as const]))),
			),
		).toBe(false);
	});

	test("nothing was online, so nothing can have dropped", () => {
		expect(
			isSuspectSample(["aaaaaaaaaa"], new Map(), known({ aaaaaaaaaa: "OFFLINE" })),
		).toBe(false);
		expect(isSuspectSample(["aaaaaaaaaa"], new Map(), new Map())).toBe(false);
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
	const stored = (over: Record<string, unknown> = {}) => ({
		address: "aaaaaaaaaa",
		status: "DIRECT",
		physicalAddress: "198.51.100.4/9993",
		pendingStatus: null,
		pendingSince: null,
		...over,
	});

	test("makes one peer list call and writes nothing when nothing changed", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([stored()]);
		peersMock.mockResolvedValue([directPeer("aaaaaaaaaa")]);

		const result = await sampleMemberStatuses();

		expect(result).toEqual({ tracked: 1, events: 0, stateWrites: 0, suspect: false });
		expect(peersMock).toHaveBeenCalledTimes(1);
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	test("the first sighting of a change stores the wait and no event", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([stored()]);
		peersMock.mockResolvedValue([directPeer("planet0001")]);

		const result = await sampleMemberStatuses({ now: T0 });

		expect(result).toMatchObject({ events: 0, stateWrites: 1, suspect: false });
		expect(db.memberStatusEvent.createMany).not.toHaveBeenCalled();
		expect(db.memberStatusState.createMany).toHaveBeenCalledWith({
			data: [stored({ pendingStatus: "OFFLINE", pendingSince: T0 })],
			skipDuplicates: true,
		});
	});

	test("the second sighting stores the event and the new status", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([
			stored({ pendingStatus: "OFFLINE", pendingSince: T0 }),
		]);
		peersMock.mockResolvedValue([directPeer("planet0001")]);

		const result = await sampleMemberStatuses({ now: T1 });

		expect(result).toMatchObject({ events: 1, stateWrites: 1 });
		expect(db.memberStatusEvent.createMany).toHaveBeenCalledWith({
			data: [
				{
					address: "aaaaaaaaaa",
					fromStatus: "DIRECT",
					toStatus: "OFFLINE",
					physicalAddress: "198.51.100.4/9993",
					createdAt: T0,
				},
			],
		});
		expect(db.memberStatusState.deleteMany).toHaveBeenCalledWith({
			where: { address: { in: ["aaaaaaaaaa"] } },
		});
		expect(db.memberStatusState.createMany).toHaveBeenCalledWith({
			data: [stored({ status: "OFFLINE" })],
			skipDuplicates: true,
		});
		expect(db.$transaction).toHaveBeenCalledTimes(1);
	});

	test("the first sample only stores baselines", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		peersMock.mockResolvedValue([directPeer("aaaaaaaaaa")]);

		const result = await sampleMemberStatuses();

		expect(result.events).toBe(0);
		expect(db.memberStatusEvent.createMany).not.toHaveBeenCalled();
		expect(db.memberStatusState.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [stored({ physicalAddress: "203.0.113.7/9993" })],
			}),
		);
	});

	test("an unreachable controller is an error, not everybody going offline", async () => {
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([stored()]);
		peersMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

		await expect(sampleMemberStatuses()).rejects.toThrow("ECONNREFUSED");
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	describe("suspect samples", () => {
		const many = Array.from(
			{ length: 10 },
			(_, i) => `node${String(i).padStart(6, "0")}`,
		);
		beforeEach(() => {
			db.network_members.findMany.mockResolvedValue(
				many.map((id) => ({ id, address: id, nwid: "cccccccccc000001" })),
			);
			db.memberStatusState.findMany.mockResolvedValue(
				many.map((address) => stored({ address })),
			);
		});

		test("one empty peer list writes nothing, not even the wait", async () => {
			peersMock.mockResolvedValue([]);

			const result = await sampleMemberStatuses({ now: T0 });

			expect(result).toEqual({ tracked: 10, events: 0, stateWrites: 0, suspect: true });
			expect(db.$transaction).not.toHaveBeenCalled();
			expect(samplerState().suspectSince).toEqual(T0);
		});

		test("the controller coming back clears it without a single write", async () => {
			peersMock.mockResolvedValue([]);
			await sampleMemberStatuses({ now: T0 });
			peersMock.mockResolvedValue(many.map((n) => directPeer(n)));

			const result = await sampleMemberStatuses({ now: T1 });

			expect(result).toMatchObject({ events: 0, stateWrites: 0, suspect: false });
			expect(db.$transaction).not.toHaveBeenCalled();
			expect(samplerState().suspectSince).toBeNull();
		});

		test("the same drop in the next sample is real and dated to the first", async () => {
			peersMock.mockResolvedValue([directPeer("planet0001")]);
			await sampleMemberStatuses({ now: T0 });

			const result = await sampleMemberStatuses({ now: T1 });

			expect(result).toMatchObject({ events: 10, suspect: false });
			const { data } = db.memberStatusEvent.createMany.mock.calls[0][0];
			expect(data).toHaveLength(10);
			expect(data[0]).toMatchObject({ toStatus: "OFFLINE", createdAt: T0 });
			expect(samplerState().suspectSince).toBeNull();
		});
	});

	test("a sample where thousands change is written in chunks", async () => {
		const nodes = Array.from({ length: 4500 }, (_, i) =>
			i.toString(16).padStart(10, "0"),
		);
		db.network_members.findMany.mockResolvedValue(
			nodes.map((id) => ({ id, address: id, nwid: "cccccccccc000001" })),
		);
		db.memberStatusState.findMany.mockResolvedValue(
			nodes.map((address) =>
				stored({ address, pendingStatus: "RELAY", pendingSince: T0 }),
			),
		);
		peersMock.mockResolvedValue(nodes.map((n) => relayPeer(n)));

		const result = await sampleMemberStatuses({ now: T1, logConnectionChanges: true });

		expect(result).toMatchObject({ events: 4500, stateWrites: 4500 });
		const sizes = (mock: jest.Mock, pick: (arg: never) => unknown[]) =>
			mock.mock.calls.map(([arg]) => pick(arg as never).length);
		expect(
			sizes(db.memberStatusEvent.createMany, (a: { data: unknown[] }) => a.data),
		).toEqual([2000, 2000, 500]);
		expect(
			sizes(
				db.memberStatusState.deleteMany,
				(a: { where: { address: { in: unknown[] } } }) => a.where.address.in,
			),
		).toEqual([2000, 2000, 500]);
		expect(db.$transaction).toHaveBeenCalledTimes(1);
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

	test("Direct/Relay changes are only logged with the switch on", async () => {
		const members = [
			{ id: "aaaaaaaaaa", address: "aaaaaaaaaa", nwid: "cccccccccc000001" },
		];
		db.network_members.findMany.mockResolvedValue(members);
		db.memberStatusState.findMany.mockResolvedValue([
			{
				address: "aaaaaaaaaa",
				status: "DIRECT",
				physicalAddress: null,
				pendingStatus: "RELAY",
				pendingSince: T0,
			},
		]);
		peersMock.mockResolvedValue([relayPeer("aaaaaaaaaa")]);
		samplerState().hasBaseline = true;

		mockSettings(true, 30, 60, false);
		await runMemberStatusSampler();
		expect(db.memberStatusEvent.createMany).not.toHaveBeenCalled();

		mockSettings(true, 30, 60, true);
		await runMemberStatusSampler();
		expect(db.memberStatusEvent.createMany).toHaveBeenCalledWith({
			data: [expect.objectContaining({ fromStatus: "DIRECT", toStatus: "RELAY" })],
		});
	});
});

describe("pruneMemberStatusEvents", () => {
	const now = new Date("2026-11-17T12:00:00Z");
	const lastCall = () => db.$executeRaw.mock.calls.at(-1)[0];

	test("deletes events older than the configured retention", async () => {
		mockSettings(true, 7);
		db.$executeRaw.mockResolvedValue(3);

		expect(await pruneMemberStatusEvents(now)).toBe(3);
		expect(db.$executeRaw).toHaveBeenCalledTimes(1);
		expect(lastCall().sql).toContain('DELETE FROM "MemberStatusEvent"');
		expect(lastCall().values).toEqual([
			new Date("2026-11-10T12:00:00Z"),
			PRUNE_BATCH_SIZE,
		]);
	});

	test("deletes in batches until a batch comes back short", async () => {
		db.$executeRaw
			.mockResolvedValueOnce(PRUNE_BATCH_SIZE)
			.mockResolvedValueOnce(PRUNE_BATCH_SIZE)
			.mockResolvedValueOnce(1234);

		expect(await pruneMemberStatusEvents(now, 30)).toBe(2 * PRUNE_BATCH_SIZE + 1234);
		expect(db.$executeRaw).toHaveBeenCalledTimes(3);
		// every statement is bounded
		for (const [sql] of db.$executeRaw.mock.calls) {
			expect(sql.sql).toMatch(/LIMIT \?/);
			expect(sql.values).toContain(PRUNE_BATCH_SIZE);
		}
	});

	test("a full last batch is followed by one more that finds nothing", async () => {
		db.$executeRaw.mockResolvedValueOnce(100).mockResolvedValueOnce(0);

		expect(await pruneMemberStatusEvents(now, 30, 100)).toBe(100);
		expect(db.$executeRaw).toHaveBeenCalledTimes(2);
	});

	test("an explicit retention wins over the stored one", async () => {
		mockSettings(true, 7);

		await pruneMemberStatusEvents(now, 1);

		expect(lastCall().values[0]).toEqual(new Date("2026-11-16T12:00:00Z"));
	});

	test("still prunes while the log is disabled", async () => {
		mockSettings(false, 30);

		await pruneMemberStatusEvents(now);

		expect(lastCall().values[0]).toEqual(new Date("2026-10-18T12:00:00Z"));
	});
});

describe("queryMemberStatusEvents", () => {
	const lastQuery = () => {
		const [events, count] = db.$queryRaw.mock.calls.map(([sql]) => sql);
		return { events, count };
	};
	const row = (id: number, createdAt: Date) => ({ id, address: "aaaaaaaaaa", createdAt });

	test("a network scoped query joins through network_members", async () => {
		db.$queryRaw
			.mockResolvedValueOnce([row(1, T0)])
			.mockResolvedValueOnce([{ total: 41 }]);

		const result = await queryMemberStatusEvents({ nwid: "nw1", pageSize: 20 });

		expect(result).toEqual({
			events: [row(1, T0)],
			nextCursor: null,
			total: 41,
			totalIsCapped: false,
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
		expect(events.sql).toContain('ORDER BY e."createdAt" DESC, e."id" DESC');
		expect(events.sql).not.toContain("OFFSET");
	});

	test("asks for one row more than the page and hands back a cursor", async () => {
		db.$queryRaw
			.mockResolvedValueOnce([row(9, T2), row(8, T1), row(7, T0)])
			.mockResolvedValueOnce([{ total: 3 }]);

		const result = await queryMemberStatusEvents({ pageSize: 2 });

		expect(lastQuery().events.values).toContain(3);
		expect(result.events).toEqual([row(9, T2), row(8, T1)]);
		expect(result.nextCursor).toEqual({ createdAt: T1, id: 8 });
	});

	test("the next page starts after the cursor, the count ignores it", async () => {
		await queryMemberStatusEvents({ cursor: { createdAt: T1, id: 8 } });

		const { events, count } = lastQuery();
		expect(events.sql).toContain('(e."createdAt", e."id") < (');
		expect(events.values).toEqual(expect.arrayContaining([T1, 8]));
		expect(count.sql).not.toContain('(e."createdAt", e."id") <');
		expect(count.values).not.toContain(8);
	});

	test("the count stops at the cap", async () => {
		db.$queryRaw
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ total: MEMBER_STATUS_EVENT_COUNT_CAP + 1 }]);

		const result = await queryMemberStatusEvents({});

		expect(result.total).toBe(MEMBER_STATUS_EVENT_COUNT_CAP);
		expect(result.totalIsCapped).toBe(true);
		const { count } = lastQuery();
		expect(count.sql).toMatch(/LIMIT \?\s+\) capped/);
		expect(count.values).toContain(MEMBER_STATUS_EVENT_COUNT_CAP + 1);
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

	test("an address search is resolved to addresses first, no LIKE on the events", async () => {
		db.network_members.findMany.mockResolvedValue([
			{ id: "aaaaaaaaaa", address: "aaaaaaaaaa" },
			{ id: "aaaabbbbbb", address: "" },
		]);

		await queryMemberStatusEvents({ addressSearch: " AAAA " });

		expect(db.network_members.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					OR: [
						{ address: { contains: "aaaa", mode: "insensitive" } },
						{ id: { contains: "aaaa", mode: "insensitive" } },
					],
				},
			}),
		);
		const { events } = lastQuery();
		expect(events.sql).not.toContain("JOIN");
		expect(events.sql).not.toContain("LIKE");
		expect(events.sql).toContain('e."address" IN (');
		expect(events.values).toEqual(expect.arrayContaining(["aaaaaaaaaa", "aaaabbbbbb"]));
	});

	test("a full address also finds a node that left every network", async () => {
		db.network_members.findMany.mockResolvedValue([]);

		await queryMemberStatusEvents({ addressSearch: "0123456789" });

		expect(lastQuery().events.values).toContain("0123456789");
	});

	test("a search that matches no node returns nothing without reading events", async () => {
		db.network_members.findMany.mockResolvedValue([]);

		const result = await queryMemberStatusEvents({ addressSearch: "zz" });

		expect(result).toMatchObject({ events: [], total: 0, nextCursor: null });
		expect(db.$queryRaw).not.toHaveBeenCalled();
	});

	test("caps the page size", async () => {
		const result = await queryMemberStatusEvents({ pageSize: 5000 });
		expect(result.pageSize).toBe(100);
	});
});
