import { describe, expect, test } from "@jest/globals";
import type { MemberEntity } from "~/types/local/member";
import { ConnectionStatus } from "~/components/networkByIdPage/table/members/constants";
import { compareMemberStatus, isCentralMemberOnline } from "~/utils/memberStatus";

const NOW = Date.UTC(2026, 10, 2, 12, 0, 0);
const minutesAgo = (m: number) => NOW - m * 60 * 1000;

const member = (id: string, fields: Partial<MemberEntity>) =>
	({ id, ...fields }) as MemberEntity;

const sortIds = (members: MemberEntity[], central: boolean) =>
	[...members].sort((a, b) => compareMemberStatus(a, b, central, NOW)).map((m) => m.id);

describe("compareMemberStatus", () => {
	test("orders local members offline, relayed, direct, controller", () => {
		const members = [
			member("controller", { conStatus: ConnectionStatus.Controller, lastSeen: NOW }),
			member("wan", { conStatus: ConnectionStatus.DirectWAN, lastSeen: NOW }),
			member("offline", {
				conStatus: ConnectionStatus.Offline,
				lastSeen: minutesAgo(90),
			}),
			member("relayed", { conStatus: ConnectionStatus.Relayed, lastSeen: NOW }),
		];
		expect(sortIds(members, false)).toEqual(["offline", "relayed", "wan", "controller"]);
	});

	test("treats LAN and WAN as the same status and breaks ties by last seen", () => {
		const members = [
			member("lan-new", {
				conStatus: ConnectionStatus.DirectLAN,
				lastSeen: minutesAgo(1),
			}),
			member("wan-old", {
				conStatus: ConnectionStatus.DirectWAN,
				lastSeen: minutesAgo(10),
			}),
		];
		expect(sortIds(members, false)).toEqual(["wan-old", "lan-new"]);
	});

	test("sorts recently seen offline members above long gone ones when descending", () => {
		const members = [
			member("months", {
				conStatus: ConnectionStatus.Offline,
				lastSeen: minutesAgo(60 * 24 * 60),
			}),
			member("minutes", { conStatus: ConnectionStatus.Offline, lastSeen: minutesAgo(2) }),
			member("never", { conStatus: undefined, lastSeen: undefined }),
		];
		expect(sortIds(members, false).reverse()).toEqual(["minutes", "months", "never"]);
	});

	test("uses the five minute last seen window for central members", () => {
		const members = [
			member("stale", { lastSeen: minutesAgo(6) }),
			member("fresh", { lastSeen: minutesAgo(4) }),
		];
		expect(sortIds(members, true)).toEqual(["stale", "fresh"]);
	});

	test("accepts last seen as a date string", () => {
		const members = [
			member("iso-new", {
				conStatus: ConnectionStatus.Offline,
				lastSeen: new Date(minutesAgo(1)).toISOString() as never,
			}),
			member("iso-old", {
				conStatus: ConnectionStatus.Offline,
				lastSeen: new Date(minutesAgo(30)).toISOString() as never,
			}),
		];
		expect(sortIds(members, false)).toEqual(["iso-old", "iso-new"]);
	});
});

describe("isCentralMemberOnline", () => {
	test("is online within five minutes and offline after", () => {
		expect(isCentralMemberOnline(member("a", { lastSeen: minutesAgo(4) }), NOW)).toBe(
			true,
		);
		expect(isCentralMemberOnline(member("b", { lastSeen: minutesAgo(6) }), NOW)).toBe(
			false,
		);
		expect(isCentralMemberOnline(member("c", { lastSeen: undefined }), NOW)).toBe(false);
	});
});
