import { MemberConnectionStatus, Prisma } from "@prisma/client";
import { prisma } from "~/server/db";
import * as ztController from "~/utils/ztApi";
import type { MemberEntity, Peers } from "~/types/local/member";
import type { UserContext } from "~/types/ctx";
import { ConnectionStatus, determineConnectionStatus } from "../utils/memberUtils";

/**
 * Member status log.
 *
 * ZeroTier keeps no history, the controller only reports the current state of
 * its own link to each node. So the log is built by sampling the controller's
 * peer list on an interval and storing a row whenever a node's status differs
 * from the previous sample. Consequences worth knowing when changing this:
 *
 * - A drop shorter than two sample intervals is never recorded, see the
 *   debounce in diffMemberStatuses.
 * - Status is per node, not per network. Events are keyed by node address and
 *   mapped to networks at read time through network_members.
 * - Relay is the same heuristic the member table uses (determineConnectionStatus).
 * - ZeroTier Central networks have no peer data and are not covered.
 */

export const MEMBER_STATUS_LOG_LIMITS = {
	retentionDays: { min: 1, max: 365, default: 30 },
	sampleInterval: { min: 10, max: 3600, default: 60 },
} as const;

// How often the sampler looks at the settings while the log is disabled. The
// settings mutation also wakes it, this is only the fallback.
export const MEMBER_STATUS_LOG_IDLE_POLL_SECONDS = 30;

export interface MemberStatusLogSettings {
	enabled: boolean;
	retentionDays: number;
	sampleInterval: number;
	/** Also store Direct to Relay and Relay to Direct changes. */
	logConnectionChanges: boolean;
}

export interface KnownStatus {
	status: MemberConnectionStatus;
	physicalAddress: string | null;
	/** A different status that was seen once and is waiting to be confirmed. */
	pendingStatus?: MemberConnectionStatus | null;
	pendingSince?: Date | null;
}

export interface StatusTransition {
	address: string;
	fromStatus: MemberConnectionStatus;
	toStatus: MemberConnectionStatus;
	physicalAddress: string | null;
	/** When the change was first seen, not when it was confirmed. */
	createdAt: Date;
}

export interface StateRow {
	address: string;
	status: MemberConnectionStatus;
	physicalAddress: string | null;
	pendingStatus: MemberConnectionStatus | null;
	pendingSince: Date | null;
}

export interface StatusDiff {
	/** Confirmed status changes. One event each. */
	transitions: StatusTransition[];
	/**
	 * Stored statuses that have to be written: first baselines, changes that
	 * are now waiting for confirmation or stopped waiting, and confirmed ones.
	 */
	states: StateRow[];
	/** Stored statuses for nodes that are no longer a member of any network. */
	stale: string[];
}

export interface DiffOptions {
	now: Date;
	/** Off: only changes to or from Offline count as a change. */
	logConnectionChanges: boolean;
	/** Off: a change counts the first time it is seen. Only for measuring. */
	debounce?: boolean;
	/**
	 * Set when the previous sample already showed the same mass drop: nodes
	 * going offline are confirmed now, dated to that previous sample.
	 */
	offlineSeenSince?: Date;
}

const clamp = (value: number, { min, max }: { min: number; max: number }) =>
	Math.min(max, Math.max(min, Math.round(value)));

export const getMemberStatusLogSettings = async (): Promise<MemberStatusLogSettings> => {
	const options = await prisma.globalOptions.findFirst({
		where: { id: 1 },
		select: {
			memberStatusLogEnabled: true,
			memberStatusLogRetentionDays: true,
			memberStatusLogSampleInterval: true,
			memberStatusLogConnectionChanges: true,
		},
	});
	const { retentionDays, sampleInterval } = MEMBER_STATUS_LOG_LIMITS;
	return {
		enabled: options?.memberStatusLogEnabled === true,
		retentionDays: clamp(
			options?.memberStatusLogRetentionDays ?? retentionDays.default,
			retentionDays,
		),
		sampleInterval: clamp(
			options?.memberStatusLogSampleInterval ?? sampleInterval.default,
			sampleInterval,
		),
		logConnectionChanges: options?.memberStatusLogConnectionChanges === true,
	};
};

export const isMemberStatusLogEnabled = async (): Promise<boolean> =>
	(await getMemberStatusLogSettings()).enabled;

/**
 * Connection status of one node from its entry in the controller's peer list.
 * Goes through determineConnectionStatus so the log can never disagree with
 * what the member table shows. LAN and WAN are both "direct".
 */
export const peerConnectionStatus = (
	address: string,
	peer: Peers | undefined,
): MemberConnectionStatus => {
	const status = determineConnectionStatus({
		id: address,
		nwid: "",
		peers: peer ?? {},
	} as MemberEntity);
	if (status === ConnectionStatus.Offline) return MemberConnectionStatus.OFFLINE;
	if (status === ConnectionStatus.Relayed) return MemberConnectionStatus.RELAY;
	return MemberConnectionStatus.DIRECT;
};

/** Address the controller currently talks to the node on, if it has a path. */
const peerPhysicalAddress = (peer: Peers | undefined): string | null => {
	if (!peer || !Array.isArray(peer.paths)) return null;
	const path =
		peer.paths.find((p) => p?.active && p?.preferred) ??
		peer.paths.find((p) => p?.active);
	return path?.address ?? null;
};

const isOffline = (status: MemberConnectionStatus) =>
	status === MemberConnectionStatus.OFFLINE;

/**
 * Whether two statuses are the same as far as the log is concerned. With
 * Direct/Relay logging off, Direct and Relay are both just "online".
 */
const sameStatus = (
	a: MemberConnectionStatus,
	b: MemberConnectionStatus,
	logConnectionChanges: boolean,
) => (logConnectionChanges ? a === b : isOffline(a) === isOffline(b));

/**
 * Compares the current peer list with the stored statuses. Pure, no I/O.
 *
 * - A node without a stored status has no baseline, so it produces no event:
 *   the first sample after enabling the log or after a restart only records
 *   where every node stands.
 * - A change has to be seen in two samples in a row before it becomes an
 *   event. The first sighting is only remembered (pendingStatus), and if the
 *   next sample is back to the old status it is forgotten again. One odd
 *   sample therefore never writes an event. The event is dated to the first
 *   sighting.
 * - With Direct/Relay logging off, a node moving between Direct and Relay is
 *   not a change at all and nothing is written for it. Its stored status keeps
 *   the kind it had when it came online.
 */
export const diffMemberStatuses = (
	addresses: Iterable<string>,
	peersByAddress: Map<string, Peers>,
	previous: Map<string, KnownStatus>,
	options: DiffOptions,
): StatusDiff => {
	const { now, logConnectionChanges, debounce = true, offlineSeenSince } = options;
	const diff: StatusDiff = { transitions: [], states: [], stale: [] };
	const seen = new Set<string>();

	for (const address of addresses) {
		if (!address || seen.has(address)) continue;
		seen.add(address);

		const peer = peersByAddress.get(address);
		const status = peerConnectionStatus(address, peer);
		const known = previous.get(address);

		if (!known) {
			diff.states.push({
				address,
				status,
				physicalAddress: peerPhysicalAddress(peer),
				pendingStatus: null,
				pendingSince: null,
			});
			continue;
		}

		if (sameStatus(known.status, status, logConnectionChanges)) {
			// Back to where it was: whatever was waiting was a blip.
			if (known.pendingStatus) {
				diff.states.push({
					address,
					status: known.status,
					physicalAddress: known.physicalAddress,
					pendingStatus: null,
					pendingSince: null,
				});
			}
			continue;
		}

		let firstSeen: Date | null = null;
		if (!debounce) {
			firstSeen = now;
		} else if (
			known.pendingStatus &&
			known.pendingSince &&
			sameStatus(known.pendingStatus, status, logConnectionChanges)
		) {
			firstSeen = known.pendingSince;
		} else if (offlineSeenSince && isOffline(status)) {
			firstSeen = offlineSeenSince;
		}

		if (!firstSeen) {
			diff.states.push({
				address,
				status: known.status,
				physicalAddress: known.physicalAddress,
				pendingStatus: status,
				pendingSince: now,
			});
			continue;
		}

		// A node that went offline or fell back to a relay has no path anymore,
		// keep the one it was last seen on.
		const physicalAddress = peerPhysicalAddress(peer) ?? known.physicalAddress;
		diff.transitions.push({
			address,
			fromStatus: known.status,
			toStatus: status,
			physicalAddress,
			createdAt: firstSeen,
		});
		diff.states.push({
			address,
			status,
			physicalAddress,
			pendingStatus: null,
			pendingSince: null,
		});
	}

	for (const address of previous.keys()) {
		if (!seen.has(address)) diff.stale.push(address);
	}
	return diff;
};

// A sample is suspect when at least this many nodes were online and at least
// this share of them is gone at once.
export const SUSPECT_MIN_ONLINE = 5;
export const SUSPECT_DROP_SHARE = 0.9;

/**
 * A peer list that is empty, or that is missing nearly every node that was
 * online a moment ago, far more often means the controller was restarted or
 * lost its uplink than that every member went offline in the same instant.
 * Such a sample is not acted on until the next one shows the same.
 */
export const isSuspectSample = (
	addresses: Iterable<string>,
	peersByAddress: Map<string, Peers>,
	previous: Map<string, KnownStatus>,
): boolean => {
	let wasOnline = 0;
	let dropped = 0;
	for (const address of new Set(addresses)) {
		const known = previous.get(address);
		if (!known || isOffline(known.status)) continue;
		wasOnline++;
		if (isOffline(peerConnectionStatus(address, peersByAddress.get(address)))) dropped++;
	}
	if (wasOnline === 0 || dropped === 0) return false;
	// The controller always has its root servers as peers. Nothing at all
	// means it is not talking to anybody.
	if (peersByAddress.size === 0) return true;
	return wasOnline >= SUSPECT_MIN_ONLINE && dropped / wasOnline >= SUSPECT_DROP_SHARE;
};

/**
 * Node addresses of every member of a local controller network. The
 * controller's own node is left out, it is never in its own peer list.
 */
export const getTrackedAddresses = async (): Promise<string[]> => {
	const members = await prisma.network_members.findMany({
		where: { deleted: false },
		select: { id: true, address: true, nwid: true },
	});
	const addresses = new Set<string>();
	for (const member of members) {
		if (member.nwid.startsWith(member.id)) continue;
		addresses.add(member.address || member.id);
	}
	return [...addresses];
};

// The local controller is an instance wide setting, ztApi never reads the user
// from the context for it.
const SYSTEM_CONTEXT = {
	session: { user: { id: "member-status-log" } },
} as unknown as UserContext;

// Rows per statement. Keeps a sample where thousands of nodes change at once
// well below the limit on bind parameters per statement.
const WRITE_CHUNK_SIZE = 2000;

const chunked = <T>(rows: T[], size = WRITE_CHUNK_SIZE): T[][] => {
	const chunks: T[][] = [];
	for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
	return chunks;
};

export interface SampleOptions {
	now?: Date;
	logConnectionChanges?: boolean;
	/** Only for measuring what the debounce saves. */
	debounce?: boolean;
}

export interface SampleResult {
	tracked: number;
	/** Events written by this sample. */
	events: number;
	/** Stored statuses written by this sample. */
	stateWrites: number;
	/** True when the sample looked like an outage and was not acted on. */
	suspect: boolean;
}

/**
 * Takes one sample: a single peer list call for the whole controller, diffed
 * against the stored status of every node. Throws when the controller cannot
 * be reached, so a failed call is skipped instead of reading as "all offline".
 */
export const sampleMemberStatuses = async (
	options: SampleOptions = {},
): Promise<SampleResult> => {
	const { now = new Date(), logConnectionChanges = false, debounce = true } = options;
	const sampler = samplerState();

	const controllerPeers = await ztController.peers(SYSTEM_CONTEXT);
	const peersByAddress = new Map<string, Peers>();
	for (const peer of controllerPeers) {
		peersByAddress.set(peer.address, peer as unknown as Peers);
	}

	const [addresses, states] = await Promise.all([
		getTrackedAddresses(),
		prisma.memberStatusState.findMany(),
	]);
	const previous = new Map<string, KnownStatus>(
		states.map((s) => [
			s.address,
			{
				status: s.status,
				physicalAddress: s.physicalAddress,
				pendingStatus: s.pendingStatus,
				pendingSince: s.pendingSince,
			},
		]),
	);

	// A mass drop is held back once. Nothing is written for it, not even the
	// "waiting for confirmation" marks, so an outage costs no writes at all.
	let offlineSeenSince: Date | undefined;
	if (debounce && isSuspectSample(addresses, peersByAddress, previous)) {
		if (!sampler.suspectSince) {
			sampler.suspectSince = now;
			return { tracked: addresses.length, events: 0, stateWrites: 0, suspect: true };
		}
		offlineSeenSince = sampler.suspectSince;
	}
	sampler.suspectSince = null;

	const diff = diffMemberStatuses(addresses, peersByAddress, previous, {
		now,
		logConnectionChanges,
		debounce,
		offlineSeenSince,
	});
	if (
		diff.transitions.length === 0 &&
		diff.states.length === 0 &&
		diff.stale.length === 0
	) {
		return { tracked: addresses.length, events: 0, stateWrites: 0, suspect: false };
	}

	// Changed rows are replaced: delete and insert keeps the number of
	// statements tied to the chunk count, not to how many nodes changed.
	const replaced = [...diff.stale, ...diff.states.map((s) => s.address)];
	await prisma.$transaction([
		...chunked(diff.transitions).map((data) =>
			prisma.memberStatusEvent.createMany({ data }),
		),
		...chunked(replaced).map((addressesChunk) =>
			prisma.memberStatusState.deleteMany({ where: { address: { in: addressesChunk } } }),
		),
		...chunked(diff.states).map((data) =>
			prisma.memberStatusState.createMany({ data, skipDuplicates: true }),
		),
	]);

	return {
		tracked: addresses.length,
		events: diff.transitions.length,
		stateWrites: diff.states.length,
		suspect: false,
	};
};

/** Forgets every stored status, so the next sample starts from no baseline. */
export const resetMemberStatusBaseline = async (): Promise<void> => {
	samplerState().suspectSince = null;
	await prisma.memberStatusState.deleteMany({});
};

// Rows deleted per statement by the prune.
export const PRUNE_BATCH_SIZE = 5000;

/**
 * Deletes events older than the retention, a batch at a time. One unbounded
 * delete on a large table holds its locks and bloats the WAL for as long as
 * it runs; small batches let the sampler and the log views get in between.
 * Returns how many rows were removed.
 */
export const pruneMemberStatusEvents = async (
	now: Date = new Date(),
	retentionDays?: number,
	batchSize: number = PRUNE_BATCH_SIZE,
): Promise<number> => {
	const days = retentionDays ?? (await getMemberStatusLogSettings()).retentionDays;
	const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
	let total = 0;
	for (;;) {
		const deleted = await prisma.$executeRaw(Prisma.sql`
			DELETE FROM "MemberStatusEvent"
			WHERE "id" IN (
				SELECT "id" FROM "MemberStatusEvent"
				WHERE "createdAt" < ${utcTimestamp(cutoff)}
				ORDER BY "createdAt"
				LIMIT ${batchSize}
			)`);
		total += deleted;
		if (deleted < batchSize) break;
	}
	return total;
};

/*
 * Sampler loop state. Kept on globalThis because the instrumentation hook that
 * runs the loop and the API routes that change the settings can be bundled as
 * separate module instances inside the same process.
 */
interface SamplerState {
	/** True once a sample has been stored since the log was last off. */
	hasBaseline: boolean;
	/** Time of a mass drop that is waiting for the next sample to confirm it. */
	suspectSince?: Date | null;
	wake?: () => void;
}
const globalForSampler = globalThis as unknown as {
	memberStatusSampler?: SamplerState;
};
export const samplerState = (): SamplerState => {
	if (!globalForSampler.memberStatusSampler) {
		globalForSampler.memberStatusSampler = { hasBaseline: false };
	}
	return globalForSampler.memberStatusSampler;
};

/** Makes the sampler read the settings now instead of at its next wake up. */
export const wakeMemberStatusSampler = (): void => {
	samplerState().wake?.();
};

/**
 * One run of the sampler. Reads the settings every time, which is what makes
 * turning the log on or off take effect without a restart. Returns the number
 * of seconds until the next run.
 */
export const runMemberStatusSampler = async (): Promise<number> => {
	const state = samplerState();
	const settings = await getMemberStatusLogSettings();

	if (!settings.enabled) {
		if (state.hasBaseline) {
			state.hasBaseline = false;
			await resetMemberStatusBaseline();
		}
		return MEMBER_STATUS_LOG_IDLE_POLL_SECONDS;
	}

	// First sample since startup or since the log was enabled: whatever is
	// stored is from before a gap of unknown length and cannot be compared to.
	if (!state.hasBaseline) await resetMemberStatusBaseline();
	await sampleMemberStatuses({ logConnectionChanges: settings.logConnectionChanges });
	state.hasBaseline = true;

	return settings.sampleInterval;
};

export interface MemberStatusEventCursor {
	createdAt: Date;
	id: number;
}

export interface MemberStatusEventFilter {
	/** Only nodes that are a member of this network. */
	nwid?: string;
	/** Exact node address. */
	address?: string;
	/** Node address contains this text. */
	addressSearch?: string;
	/** Only events that ended in this status. */
	status?: MemberConnectionStatus;
	/** Include Direct to Relay and Relay to Direct changes. */
	includeConnectionChanges?: boolean;
	/** Last event of the previous page. Omitted for the first page. */
	cursor?: MemberStatusEventCursor | null;
	pageSize?: number;
}

export interface MemberStatusEventRow {
	id: number;
	address: string;
	fromStatus: MemberConnectionStatus;
	toStatus: MemberConnectionStatus;
	physicalAddress: string | null;
	createdAt: Date;
	/** Only set when the query is scoped to one network. */
	memberName?: string | null;
}

export interface MemberStatusEventPage {
	events: MemberStatusEventRow[];
	/** Pass back as `cursor` for the next page. Null on the last page. */
	nextCursor: MemberStatusEventCursor | null;
	/** Number of matching events, counted up to MEMBER_STATUS_EVENT_COUNT_CAP. */
	total: number;
	/** True when there are more matching events than `total`. */
	totalIsCapped: boolean;
	pageSize: number;
}

// The log can hold millions of rows. An exact count has to visit every
// matching row (10 s for a 1000 member network at 10 million events), so the
// count stops here and the views show it as "1000+".
export const MEMBER_STATUS_EVENT_COUNT_CAP = 1000;

// At most this many node addresses are matched by an address search.
const ADDRESS_SEARCH_LIMIT = 1000;

/** A JS date as a UTC `timestamp`, which is how Prisma stores DateTime. */
const utcTimestamp = (date: Date) =>
	Prisma.sql`(${date}::timestamptz AT TIME ZONE 'UTC')`;

/**
 * Node addresses containing `search`. The search runs against the member
 * table, which is small, so the event table can then be read through its
 * (address, createdAt) index instead of being scanned with a LIKE.
 */
const findAddresses = async (search: string): Promise<string[]> => {
	const term = search.trim().toLowerCase();
	const members = await prisma.network_members.findMany({
		where: {
			OR: [
				{ address: { contains: term, mode: "insensitive" } },
				{ id: { contains: term, mode: "insensitive" } },
			],
		},
		select: { id: true, address: true },
		distinct: ["id"],
		take: ADDRESS_SEARCH_LIMIT,
	});
	const addresses = new Set(members.map((m) => m.address || m.id));
	// A complete address also finds a node that has left every network.
	if (/^[0-9a-f]{10}$/.test(term)) addresses.add(term);
	return [...addresses];
};

/**
 * Reads events, newest first.
 *
 * With `nwid` the events are joined through network_members, so only nodes
 * that are an active member of that network are returned, and only events
 * from after the node joined it. Whatever a node did before it was a member
 * belongs to another network. The caller is responsible for checking that the
 * user may read `nwid`.
 *
 * Paging is by cursor (the last row of the previous page), not by offset: a
 * page deep into a large log costs the same as the first one.
 */
export const queryMemberStatusEvents = async (
	filter: MemberStatusEventFilter,
): Promise<MemberStatusEventPage> => {
	const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
	const empty: MemberStatusEventPage = {
		events: [],
		nextCursor: null,
		total: 0,
		totalIsCapped: false,
		pageSize,
	};

	const join = filter.nwid
		? Prisma.sql`JOIN "network_members" m
				ON COALESCE(NULLIF(m."address", ''), m."id") = e."address"
				AND m."nwid" = ${filter.nwid}
				AND m."deleted" IS NOT TRUE
				AND e."createdAt" >= m."creationTime"`
		: Prisma.empty;

	const conditions: Prisma.Sql[] = [];
	if (filter.address) conditions.push(Prisma.sql`e."address" = ${filter.address}`);
	if (filter.addressSearch?.trim()) {
		const addresses = await findAddresses(filter.addressSearch);
		if (addresses.length === 0) return empty;
		conditions.push(Prisma.sql`e."address" IN (${Prisma.join(addresses)})`);
	}
	if (filter.status) {
		conditions.push(
			Prisma.sql`e."toStatus" = ${filter.status}::"MemberConnectionStatus"`,
		);
	}
	if (!filter.includeConnectionChanges) {
		conditions.push(Prisma.sql`(e."fromStatus" = 'OFFLINE' OR e."toStatus" = 'OFFLINE')`);
	}
	const whereOf = (parts: Prisma.Sql[]) =>
		parts.length ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}` : Prisma.empty;

	const pageConditions = filter.cursor
		? [
				...conditions,
				Prisma.sql`(e."createdAt", e."id") < (${utcTimestamp(filter.cursor.createdAt)}, ${filter.cursor.id})`,
			]
		: conditions;

	const memberName = filter.nwid ? Prisma.sql`, m."name" AS "memberName"` : Prisma.empty;

	const [rows, count] = await Promise.all([
		// One row more than the page, to know whether there is a next page.
		prisma.$queryRaw<MemberStatusEventRow[]>(Prisma.sql`
			SELECT e."id", e."address", e."fromStatus", e."toStatus",
				e."physicalAddress", e."createdAt"${memberName}
			FROM "MemberStatusEvent" e
			${join}
			${whereOf(pageConditions)}
			ORDER BY e."createdAt" DESC, e."id" DESC
			LIMIT ${pageSize + 1}`),
		prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
			SELECT COUNT(*)::int AS "total" FROM (
				SELECT 1
				FROM "MemberStatusEvent" e
				${join}
				${whereOf(conditions)}
				LIMIT ${MEMBER_STATUS_EVENT_COUNT_CAP + 1}
			) capped`),
	]);

	const events = rows.slice(0, pageSize);
	const last = events[events.length - 1];
	const counted = count[0]?.total ?? 0;
	return {
		events,
		nextCursor:
			rows.length > pageSize && last ? { createdAt: last.createdAt, id: last.id } : null,
		total: Math.min(counted, MEMBER_STATUS_EVENT_COUNT_CAP),
		totalIsCapped: counted > MEMBER_STATUS_EVENT_COUNT_CAP,
		pageSize,
	};
};

export const EMPTY_MEMBER_STATUS_EVENT_PAGE: MemberStatusEventPage = {
	events: [],
	nextCursor: null,
	total: 0,
	totalIsCapped: false,
	pageSize: 25,
};
