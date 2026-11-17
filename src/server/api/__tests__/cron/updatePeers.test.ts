// NOTE: use the global `jest` (not @jest/globals) so ts-jest hoists `jest.mock`
// above the imports.
jest.mock("~/utils/ztApi", () => ({}));
jest.mock("~/server/api/services/memberService", () => ({
	reconcileNetworkMembers: jest.fn().mockResolvedValue([]),
}));

import { prisma } from "~/server/db";
import { reconcileNetworkMembers } from "~/server/api/services/memberService";
import { reconcileInactiveUsersNetworks } from "~/cronTasks";

const longAgo = new Date(Date.now() - 60 * 60000);

const user = (id: string, orgNetworks: string[] = [], lastseen: Date = longAgo) => ({
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

	test("skips users that were seen in the last five minutes", async () => {
		db.user.findMany = jest.fn().mockResolvedValue([user("active", [], new Date())]);
		mockNetworksByAuthor({ active: ["nw1"] });

		expect(await reconcileInactiveUsersNetworks()).toEqual([]);
		expect(reconcileMock).not.toHaveBeenCalled();
	});
});
