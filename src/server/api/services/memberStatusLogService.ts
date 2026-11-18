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
}

/** A sample that looked like an outage and was kept in memory, not acted on. */
export interface HeldSample {
	since: Date;
	/** What that sample showed for every tracked node. */
	statuses: Map<string, MemberConnectionStatus>;
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
	const { now, logConnectionChanges, debounce = true } = options;
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
			// Back to where it was: whatever was waiting was a blip. A node that
			// stayed online but moved to another address is remembered too, so
			// the event for it going offline later carries the last address.
			const current = peerPhysicalAddress(peer);
			const moved = current !== null && current !== known.physicalAddress;
			if (known.pendingStatus || moved) {
				diff.states.push({
					address,
					status: known.status,
					physicalAddress: moved ? current : known.physicalAddress,
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
 * Folds a held sample into the stored statuses, in memory only. The held
 * sample counts as one sighting per node and never confirms anything by
 * itself: a status it showed for the first time starts waiting from that
 * sample, and a wait it contradicted is dropped. The next sample is then
 * diffed against the result, so every node still needs two sightings in a row.
 */
export const applyHeldSample = (
	previous: Map<string, KnownStatus>,
	held: HeldSample,
	logConnectionChanges: boolean,
): Map<string, KnownStatus> => {
	const adjusted = new Map(previous);
	for (const [address, known] of previous) {
		const seen = held.statuses.get(address);
		if (seen === undefined) continue;
		if (sameStatus(known.status, seen, logConnectionChanges)) {
			if (known.pendingStatus) {
				adjusted.set(address, { ...known, pendingStatus: null, pendingSince: null });
			}
			continue;
		}
		const alreadyWaiting =
			known.pendingStatus &&
			known.pendingSince &&
			sameStatus(known.pendingStatus, seen, logConnectionChanges);
		if (!alreadyWaiting) {
			adjusted.set(address, { ...known, pendingStatus: seen, pendingSince: held.since });
		}
	}
	return adjusted;
};

const sameStoredStatus = (a: KnownStatus | undefined, b: KnownStatus): boolean =>
	!!a &&
	a.status === b.status &&
	a.physicalAddress === b.physicalAddress &&
	(a.pendingStatus ?? null) === (b.pendingStatus ?? null) &&
	(a.pendingSince?.getTime() ?? null) === (b.pendingSince?.getTime() ?? null);

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

/**
 * Keeps network_members.statusLogSince current: the time from which a member
 * row has been continuously active, as far as the sampler saw. A stashed row
 * loses it and gets a new one when it is restored, so the events of the time
 * in between are never shown in that network. Two statements that normally
 * match no rows.
 */
export const markTrackedMemberships = async (now: Date): Promise<void> => {
	await prisma.network_members.updateMany({
		where: { deleted: true, statusLogSince: { not: null } },
		data: { statusLogSince: null },
	});
	await prisma.network_members.updateMany({
		where: { deleted: false, statusLogSince: null },
		data: { statusLogSince: now },
	});
};

// The peer list is one request. Without a limit a controller that accepts the
// connection and then stops answering would stall the sampler for good.
export const PEER_REQUEST_TIMEOUT_MS = 10000;

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
	/**
	 * True when there was no baseline yet and the controller had no peers at
	 * all. Nothing was stored, the next sample tries again.
	 */
	deferred: boolean;
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

	const controllerPeers = await ztController.peers(SYSTEM_CONTEXT, {
		timeout: PEER_REQUEST_TIMEOUT_MS,
	});
	const peersByAddress = new Map<string, Peers>();
	for (const peer of controllerPeers) {
		peersByAddress.set(peer.address, peer as unknown as Peers);
	}

	await markTrackedMemberships(now);
	const [addresses, states] = await Promise.all([
		getTrackedAddresses(),
		prisma.memberStatusState.findMany(),
	]);
	const stored = new Map<string, KnownStatus>(
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
	const result = { tracked: addresses.length, events: 0, stateWrites: 0 };

	// No baseline yet and a controller that is not talking to anybody, which
	// is what it looks like right after it started. Storing that would make
	// every member "offline" and log all of them coming online a moment later.
	if (stored.size === 0 && peersByAddress.size === 0) {
		return { ...result, suspect: false, deferred: true };
	}

	// A mass drop is held back once. Nothing is written for it, not even the
	// "waiting for confirmation" marks, so an outage costs no writes at all.
	// It is kept in memory and counts as one sighting per node when the next
	// sample is compared.
	const held = sampler.held;
	sampler.held = null;
	if (debounce && !held && isSuspectSample(addresses, peersByAddress, stored)) {
		sampler.held = {
			since: now,
			statuses: new Map(
				addresses.map((address) => [
					address,
					peerConnectionStatus(address, peersByAddress.get(address)),
				]),
			),
		};
		return { ...result, suspect: true, deferred: false };
	}
	const previous =
		held && debounce ? applyHeldSample(stored, held, logConnectionChanges) : stored;

	const diff = diffMemberStatuses(addresses, peersByAddress, previous, {
		now,
		logConnectionChanges,
		debounce,
	});

	// What the held sample changed in memory has to be stored as well, and
	// rows that end up the way they are stored need no write.
	const touched = new Set(diff.states.map((s) => s.address));
	const tracked = new Set(addresses);
	for (const [address, known] of previous) {
		if (touched.has(address) || !tracked.has(address)) continue;
		if (known === stored.get(address)) continue;
		diff.states.push({
			address,
			status: known.status,
			physicalAddress: known.physicalAddress,
			pendingStatus: known.pendingStatus ?? null,
			pendingSince: known.pendingSince ?? null,
		});
	}
	diff.states = diff.states.filter((s) => !sameStoredStatus(stored.get(s.address), s));

	if (
		diff.transitions.length === 0 &&
		diff.states.length === 0 &&
		diff.stale.length === 0
	) {
		return { ...result, suspect: false, deferred: false };
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
		deferred: false,
	};
};

/** Forgets every stored status, so the next sample starts from no baseline. */
export const resetMemberStatusBaseline = async (): Promise<void> => {
	samplerState().held = null;
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
	/** A mass drop that is waiting for the next sample to confirm it. */
	held?: HeldSample | null;
	wake?: () => void;
	/** Tail of the chain that runExclusive appends to. */
	queue?: Promise<void>;
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

/**
 * Runs `task` after everything queued before it has finished. A sample and a
 * settings change both go through here, so a sample that started under the
 * old settings is done before the baseline is reset, and can neither write
 * events after the log was turned off nor bring the old baseline back.
 */
export const runExclusive = <T>(task: () => Promise<T>): Promise<T> => {
	const state = samplerState();
	const result = (state.queue ?? Promise.resolve()).then(task);
	state.queue = result.then(
		() => undefined,
		() => undefined,
	);
	return result;
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
export const runMemberStatusSampler = (): Promise<number> =>
	runExclusive(runMemberStatusSamplerOnce);

const runMemberStatusSamplerOnce = async (): Promise<number> => {
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
	const sample = await sampleMemberStatuses({
		logConnectionChanges: settings.logConnectionChanges,
	});
	if (!sample.deferred) state.hasBaseline = true;

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

// Above this many matching node addresses the search is done on the events
// directly, which is slower but has no upper bound.
export const ADDRESS_SEARCH_LIMIT = 5000;

/** A JS date as a UTC `timestamp`, which is how Prisma stores DateTime. */
const utcTimestamp = (date: Date) =>
	Prisma.sql`(${date}::timestamptz AT TIME ZONE 'UTC')`;

/**
 * Node addresses that have events and contain `term`, or null when there are
 * more than ADDRESS_SEARCH_LIMIT of them.
 *
 * The addresses come from the events themselves, so a node that has left
 * every network is still found. Listing them is a skip scan over the
 * (address, createdAt) index, one probe per distinct address, not a pass over
 * every event. The events are then read through that same index.
 */
const findEventAddresses = async (term: string): Promise<string[] | null> => {
	const rows = await prisma.$queryRaw<Array<{ address: string }>>(Prisma.sql`
		WITH RECURSIVE known AS (
			(SELECT "address" FROM "MemberStatusEvent" ORDER BY "address" LIMIT 1)
			UNION ALL
			SELECT (
				SELECT e."address" FROM "MemberStatusEvent" e
				WHERE e."address" > k."address"
				ORDER BY e."address" LIMIT 1
			)
			FROM known k WHERE k."address" IS NOT NULL
		)
		SELECT "address" FROM known
		WHERE "address" IS NOT NULL AND position(${term} in lower("address")) > 0
		LIMIT ${ADDRESS_SEARCH_LIMIT + 1}`);
	if (rows.length > ADDRESS_SEARCH_LIMIT) return null;
	return rows.map((row) => row.address);
};

/**
 * Reads events, newest first.
 *
 * With `nwid` the events are joined through network_members, so only nodes
 * that are an active member of that network are returned, and only events
 * from the time the member row has been continuously active (statusLogSince,
 * see markTrackedMemberships). Whatever a node did before it was a member, or
 * while it was stashed, belongs to another network. The caller is responsible
 * for checking that the user may read `nwid`.
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
				AND e."createdAt" >= m."statusLogSince"`
		: Prisma.empty;

	const conditions: Prisma.Sql[] = [];
	if (filter.address) conditions.push(Prisma.sql`e."address" = ${filter.address}`);
	if (filter.addressSearch?.trim()) {
		const term = filter.addressSearch.trim().toLowerCase();
		const addresses = await findEventAddresses(term);
		if (addresses === null) {
			conditions.push(Prisma.sql`position(${term} in lower(e."address")) > 0`);
		} else if (addresses.length === 0) {
			return empty;
		} else {
			conditions.push(Prisma.sql`e."address" IN (${Prisma.join(addresses)})`);
		}
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
