import { test, expect } from "@jest/globals";
import { appRouter } from "../../root";
import { type Session } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { type PartialDeep } from "type-fest";
import { MemberCounts } from "~/types/local/member";

const mockSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	update: { name: "test" },
	user: {
		id: "userid",
		name: "Bernt Christian",
		email: "mail@gmail.com",
	},
};

// Mock the ZeroTier controller
jest.mock("~/utils/ztApi", () => ({
	member_details: jest.fn().mockImplementation((_ctx, nwid, memberId) => {
		// Mock both members as authorized for this test
		return Promise.resolve({
			authorized: true,
			// Add other required properties that your implementation might need
			id: memberId,
			nwid: nwid,
		});
	}),
}));

test("getUserNetworks", async () => {
	const prismaMock = new PrismaClient();

	interface Network {
		nwid: string;
		name: string;
		authorId: number;
		networkMembers: NetworkMember[];
		memberCounts: MemberCounts;
	}

	interface NetworkMember {
		id: string;
		authorized: boolean;
	}

	const mockOutput: Network[] = [
		{
			nwid: "1",
			name: "test",
			authorId: 10,
			memberCounts: {
				display: "2 (2)",
				authorized: 2,
				total: 2,
			},
			networkMembers: [
				{
					id: "4ef7287f63",
					authorized: true,
				},
				{
					id: "efcc1b0947",
					authorized: true,
				},
			],
		},
	];

	prismaMock.network.findMany = jest.fn().mockResolvedValue(mockOutput);

	const caller = appRouter.createCaller({
		session: mockSession as Session,
		wss: null,
		prisma: prismaMock,
		res: null,
	});

	const result = await caller.network.getUserNetworks({
		central: false,
	});

	expect(result).toHaveLength(mockOutput.length);
	expect(result).toStrictEqual(mockOutput);
});
