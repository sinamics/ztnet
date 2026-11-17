import type { MemberEntity } from "~/types/local/member";
import { ConnectionStatus } from "~/components/networkByIdPage/table/members/constants";

// Central has no live peer data, so a member counts as online when the
// controller saw it within this window.
const CENTRAL_ONLINE_WINDOW_MS = 5 * 60 * 1000;

const lastSeenMs = (member: MemberEntity): number => {
	const ms = new Date(member?.lastSeen ?? 0).getTime();
	return Number.isNaN(ms) ? 0 : ms;
};

export const isCentralMemberOnline = (member: MemberEntity, now = Date.now()): boolean =>
	lastSeenMs(member) >= now - CENTRAL_ONLINE_WINDOW_MS;

// Offline sorts lowest, then relayed, direct and the controller itself,
// matching what the status column shows.
const statusRank = (member: MemberEntity, central: boolean, now: number): number => {
	if (central) return isCentralMemberOnline(member, now) ? 1 : 0;
	switch (member?.conStatus) {
		case ConnectionStatus.Controller:
			return 3;
		case ConnectionStatus.DirectLAN:
		case ConnectionStatus.DirectWAN:
			return 2;
		case ConnectionStatus.Relayed:
			return 1;
		default:
			return 0;
	}
};

/**
 * Compares two members by connection status, then by last seen, so members
 * that went offline recently sort next to the online ones.
 */
export const compareMemberStatus = (
	a: MemberEntity,
	b: MemberEntity,
	central: boolean,
	now = Date.now(),
): number =>
	statusRank(a, central, now) - statusRank(b, central, now) ||
	lastSeenMs(a) - lastSeenMs(b);
