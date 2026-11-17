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
 * - A drop shorter than the sample interval is never seen.
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
}

export interface KnownStatus {
	status: MemberConnectionStatus;
	physicalAddress: string | null;
}

export interface StatusTransition {
	address: string;
	fromStatus: MemberConnectionStatus;
	toStatus: MemberConnectionStatus;
	physicalAddress: string | null;
}

export interface StatusDiff {
	/** Status changes since the previous sample. One event each. */
	transitions: StatusTransition[];
	/** Nodes seen for the first time. They get a baseline and no event. */
	baselines: Array<{ address: string } & KnownStatus>;
	/** Stored baselines for nodes that are no longer a member of any network. */
	stale: string[];
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

/**
 * Compares the current peer list with the previous sample. Pure, no I/O.
 *
 * A node without a stored status has no baseline, so it produces no event:
 * the first sample after enabling the log or after a restart only records
 * where every node stands.
 */
export const diffMemberStatuses = (
	addresses: Iterable<string>,
	peersByAddress: Map<string, Peers>,
	previous: Map<string, KnownStatus>,
): StatusDiff => {
	const diff: StatusDiff = { transitions: [], baselines: [], stale: [] };
	const seen = new Set<string>();

	for (const address of addresses) {
		if (!address || seen.has(address)) continue;
		seen.add(address);

		const peer = peersByAddress.get(address);
		const status = peerConnectionStatus(address, peer);
		const known = previous.get(address);

		if (!known) {
			diff.baselines.push({
				address,
				status,
				physicalAddress: peerPhysicalAddress(peer),
			});
			continue;
		}
		if (known.status === status) continue;

		diff.transitions.push({
			address,
			fromStatus: known.status,
			toStatus: status,
			// A node that went offline or fell back to a relay has no path
			// anymore, keep the one it was last seen on.
			physicalAddress: peerPhysicalAddress(peer) ?? known.physicalAddress,
		});
	}

	for (const address of previous.keys()) {
		if (!seen.has(address)) diff.stale.push(address);
	}
	return diff;
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

/**
 * Takes one sample: a single peer list call for the whole controller, diffed
 * against the stored status of every node. Throws when the controller cannot
 * be reached, so a failed call is skipped instead of reading as "all offline".
 */
export const sampleMemberStatuses = async (
	now: Date = new Date(),
): Promise<{ tracked: number; events: number }> => {
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
			{ status: s.status, physicalAddress: s.physicalAddress },
		]),
	);

	const { transitions, baselines, stale } = diffMemberStatuses(
		addresses,
		peersByAddress,
		previous,
	);
	if (transitions.length === 0 && baselines.length === 0 && stale.length === 0) {
		return { tracked: addresses.length, events: 0 };
	}

	// Changed nodes get their baseline replaced. Delete and insert keeps this at
	// a fixed number of statements however many nodes changed in one sample.
	const replaced = [...stale, ...transitions.map((t) => t.address)];
	const newStates = [
		...baselines.map(({ address, status, physicalAddress }) => ({
			address,
			status,
			physicalAddress,
		})),
		...transitions.map((t) => ({
			address: t.address,
			status: t.toStatus,
			physicalAddress: t.physicalAddress,
		})),
	];

	await prisma.$transaction([
		prisma.memberStatusEvent.createMany({
			data: transitions.map((t) => ({ ...t, createdAt: now })),
		}),
		prisma.memberStatusState.deleteMany({ where: { address: { in: replaced } } }),
		prisma.memberStatusState.createMany({ data: newStates, skipDuplicates: true }),
	]);

	return { tracked: addresses.length, events: transitions.length };
};

/** Forgets every stored status, so the next sample starts from no baseline. */
export const resetMemberStatusBaseline = async (): Promise<void> => {
	await prisma.memberStatusState.deleteMany({});
};

/** Deletes events older than the retention. Returns how many were removed. */
export const pruneMemberStatusEvents = async (
	now: Date = new Date(),
	retentionDays?: number,
): Promise<number> => {
	const days = retentionDays ?? (await getMemberStatusLogSettings()).retentionDays;
	const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
	const { count } = await prisma.memberStatusEvent.deleteMany({
		where: { createdAt: { lt: cutoff } },
	});
	return count;
};

/*
 * Sampler loop state. Kept on globalThis because the instrumentation hook that
 * runs the loop and the API routes that change the settings can be bundled as
 * separate module instances inside the same process.
 */
interface SamplerState {
	/** True once a sample has been stored since the log was last off. */
	hasBaseline: boolean;
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
	await sampleMemberStatuses();
	state.hasBaseline = true;

	return settings.sampleInterval;
};

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
	page?: number;
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
	total: number;
	page: number;
	pageSize: number;
}

/**
 * Reads events, newest first.
 *
 * With `nwid` the events are joined through network_members, so only nodes
 * that are an active member of that network are returned, and only events
 * from after the node joined it. Whatever a node did before it was a member
 * belongs to another network. The caller is responsible for checking that the
 * user may read `nwid`.
 */
export const queryMemberStatusEvents = async (
	filter: MemberStatusEventFilter,
): Promise<MemberStatusEventPage> => {
	const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
	const page = Math.max(0, filter.page ?? 0);

	const join = filter.nwid
		? Prisma.sql`JOIN "network_members" m
				ON COALESCE(NULLIF(m."address", ''), m."id") = e."address"
				AND m."nwid" = ${filter.nwid}
				AND m."deleted" IS NOT TRUE
				AND e."createdAt" >= m."creationTime"`
		: Prisma.empty;

	const conditions: Prisma.Sql[] = [];
	if (filter.address) conditions.push(Prisma.sql`e."address" = ${filter.address}`);
	if (filter.addressSearch) {
		const escaped = filter.addressSearch.replace(/[\\%_]/g, "\\$&");
		conditions.push(Prisma.sql`e."address" ILIKE ${`%${escaped}%`}`);
	}
	if (filter.status) {
		conditions.push(
			Prisma.sql`e."toStatus" = ${filter.status}::"MemberConnectionStatus"`,
		);
	}
	if (!filter.includeConnectionChanges) {
		conditions.push(Prisma.sql`(e."fromStatus" = 'OFFLINE' OR e."toStatus" = 'OFFLINE')`);
	}
	const where = conditions.length
		? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
		: Prisma.empty;

	const memberName = filter.nwid ? Prisma.sql`, m."name" AS "memberName"` : Prisma.empty;

	const [events, count] = await Promise.all([
		prisma.$queryRaw<MemberStatusEventRow[]>(Prisma.sql`
			SELECT e."id", e."address", e."fromStatus", e."toStatus",
				e."physicalAddress", e."createdAt"${memberName}
			FROM "MemberStatusEvent" e
			${join}
			${where}
			ORDER BY e."createdAt" DESC, e."id" DESC
			LIMIT ${pageSize} OFFSET ${page * pageSize}`),
		prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
			SELECT COUNT(*)::int AS "total"
			FROM "MemberStatusEvent" e
			${join}
			${where}`),
	]);

	return { events, total: count[0]?.total ?? 0, page, pageSize };
};

export const EMPTY_MEMBER_STATUS_EVENT_PAGE: MemberStatusEventPage = {
	events: [],
	total: 0,
	page: 0,
	pageSize: 25,
};
