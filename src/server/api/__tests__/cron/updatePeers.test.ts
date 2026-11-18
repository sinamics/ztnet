// NOTE: use the global `jest` (not @jest/globals) so ts-jest hoists `jest.mock`
// above the imports.
jest.mock("~/utils/ztApi", () => ({}));
jest.mock("~/server/api/services/memberService", () => ({
	reconcileNetworkMembers: jest.fn().mockResolvedValue([]),
}));
jest.mock("~/server/api/services/memberStatusLogService", () => ({
	...jest.requireActual("~/server/api/services/memberStatusLogService"),
	runMemberStatusSampler: jest.fn(),
}));

import { prisma } from "~/server/db";
import { reconcileNetworkMembers } from "~/server/api/services/memberService";
import { memberStatusSampler, reconcileInactiveUsersNetworks } from "~/cronTasks";
import {
	runMemberStatusSampler,
	wakeMemberStatusSampler,
} from "~/server/api/services/memberStatusLogService";

const longAgo = new Date(Date.now() - 60 * 60000);

const user = (
	id: string,
	orgNetworks: string[] = [],
	lastseen: Date | null = longAgo,
) => ({
	id,
	lastseen,
	memberOfOrgs: orgNetworks.length
		? [{ networks: orgNetworks.map((nwid) => ({ nwid })) }]
		: [],
});

// biome-ignore lint/suspicious/noExplicitAny: the cron uses the prisma singleton; reassign its methods
const db = prisma as any;
const reconcileMock = reconcileNetworkMembers as jest.Mock;

const mockNetworksByAuthor = (byAuthor: Record<string, string[]>) => {
	db.network.findMany = jest.fn(({ where }) =>
		Promise.resolve((byAuthor[where.authorId] ?? []).map((nwid) => ({ nwid }))),
	);
};

describe("reconcileInactiveUsersNetworks", () => {
	test("an inactive user without networks does not stop the users after them", async () => {
		db.user.findMany = jest
			.fn()
			.mockResolvedValue([user("no-networks"), user("has-networks")]);
		mockNetworksByAuthor({ "has-networks": ["nw1"] });

		const processed = await reconcileInactiveUsersNetworks();

		expect(processed).toEqual(["nw1"]);
		expect(reconcileMock).toHaveBeenCalledTimes(1);
		expect(reconcileMock).toHaveBeenCalledWith(
			{ session: { user: { id: "has-networks" } } },
			"nw1",
		);
	});

	test("reconciles personal and organization networks once each", async () => {
		db.user.findMany = jest
			.fn()
			.mockResolvedValue([user("a", ["org-nw"]), user("b", ["org-nw"])]);
		mockNetworksByAuthor({ a: ["nw-a"], b: ["nw-b"] });

		const processed = await reconcileInactiveUsersNetworks();

		expect(processed).toEqual(["nw-a", "org-nw", "nw-b"]);
		expect(reconcileMock).toHaveBeenCalledTimes(3);
	});

	test("a user that has never been seen counts as inactive", async () => {
		db.user.findMany = jest.fn().mockResolvedValue([user("api-only", [], null)]);
		mockNetworksByAuthor({ "api-only": ["nw1"] });

		expect(await reconcileInactiveUsersNetworks()).toEqual(["nw1"]);
		expect(reconcileMock).toHaveBeenCalledTimes(1);
	});

	test("skips users that were seen in the last five minutes", async () => {
		db.user.findMany = jest.fn().mockResolvedValue([user("active", [], new Date())]);
		mockNetworksByAuthor({ active: ["nw1"] });

		expect(await reconcileInactiveUsersNetworks()).toEqual([]);
		expect(reconcileMock).not.toHaveBeenCalled();
	});
});

describe("memberStatusSampler", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	test("a wake during a sample runs it again right after, not at the old interval", async () => {
		jest.useFakeTimers();
		let finish: (seconds: number) => void = () => {};
		const runSpy = (runMemberStatusSampler as jest.Mock)
			.mockReset()
			.mockImplementationOnce(
				() =>
					new Promise<number>((resolve) => {
						finish = resolve;
					}),
			)
			.mockResolvedValue(3600);

		await memberStatusSampler();
		expect(runSpy).toHaveBeenCalledTimes(1);

		// settings are saved while the first sample is still running
		wakeMemberStatusSampler();
		expect(runSpy).toHaveBeenCalledTimes(1);

		// it ends with the interval it read before the change
		finish(3600);
		await jest.advanceTimersByTimeAsync(0);

		expect(runSpy).toHaveBeenCalledTimes(2);
		// and after that it is back to the interval, no extra runs
		await jest.advanceTimersByTimeAsync(1000);
		expect(runSpy).toHaveBeenCalledTimes(2);
	});
});
