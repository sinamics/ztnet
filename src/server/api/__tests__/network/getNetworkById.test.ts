// Use the global `jest` so ts-jest hoists these module mocks above the imports.
jest.mock("~/server/api/services/memberService", () => ({
	...jest.requireActual("~/server/api/services/memberService"),
	reconcileNetworkMembersOnce: jest.fn().mockResolvedValue([]),
	triggerBackgroundReconcile: jest.fn(),
}));
jest.mock("~/utils/ztApi", () => ({
	get_network: jest.fn(),
}));

import { PrismaClient } from "@prisma/client";
import type { Session } from "~/lib/authTypes";
import { appRouter } from "../../root";
import { type PartialDeep } from "type-fest";
import { TRPCError } from "@trpc/server";
import * as ztController from "~/utils/ztApi";

const prisma = new PrismaClient();
const mockSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	user: {
		id: "userid",
		name: "Bernt Christian",
		email: "mail@gmail.com",
	},
};

it("should throw an error if the user is not the author of the network", async () => {
	prisma.network.findUnique = jest.fn().mockRejectedValue(
		new TRPCError({
			message: "Network not found!",
			code: "BAD_REQUEST",
		}),
	);

	const caller = appRouter.createCaller({
		session: mockSession as Session,
		wss: null,
		prisma: prisma,
		res: null,
		req: null,
	});
	try {
		await caller.network.getNetworkById({ nwid: "test_nw_id" });
	} catch (error) {
		expect(error.message).toBe("Network not found!");
		expect(error.code).toBe("BAD_REQUEST");
	}
});

describe("stashed and permanently deleted members", () => {
	const row = (id: string, over: Record<string, unknown> = {}) => ({
		id,
		nwid: "nw1",
		name: `node ${id}`,
		authorized: false,
		deleted: true,
		permanentlyDeleted: false,
		creationTime: new Date("2026-01-01T00:00:00Z"),
		controllerConfig: { authorized: false, ipAssignments: ["10.0.0.1"] },
		statusLogSince: new Date("2026-02-01T00:00:00Z"),
		...over,
	});

	it("strips internal columns from both lists", async () => {
		(ztController.get_network as jest.Mock).mockResolvedValue({
			id: "nw1",
			routes: [],
		});
		const ctx = {
			session: mockSession as Session,
			wss: null,
			res: null,
			req: null,
			prisma: {
				network: {
					findUnique: jest.fn().mockResolvedValue({
						nwid: "nw1",
						authorId: "userid",
						organizationId: null,
						organization: null,
						routes: [],
					}),
				},
				network_members: {
					count: jest.fn().mockResolvedValue(3),
					findMany: jest
						.fn()
						.mockResolvedValueOnce([row("stashed01")])
						.mockResolvedValueOnce([row("deleted01", { permanentlyDeleted: true })]),
				},
			},
		};

		// biome-ignore lint/suspicious/noExplicitAny: minimal trpc ctx
		const caller = appRouter.createCaller(ctx as any);
		const result = await caller.network.getNetworkById({ nwid: "nw1" });

		expect(result.zombieMembers.map((m) => m.id)).toEqual(["stashed01"]);
		expect(result.permanentlyDeletedMembers.map((m) => m.id)).toEqual(["deleted01"]);
		for (const member of [...result.zombieMembers, ...result.permanentlyDeletedMembers]) {
			expect(member).not.toHaveProperty("controllerConfig");
			expect(member).not.toHaveProperty("statusLogSince");
			// Fields the deleted members table renders are still served.
			expect(member).toMatchObject({
				nwid: "nw1",
				authorized: false,
				creationTime: expect.any(Date),
			});
		}
	});
});

// test("getNetworkById returns network and member data", async () => {
// const prismaSpies = {
//   findFirst: jest.spyOn(prisma.network, "findFirst"),
//   findMany: jest.spyOn(prisma.networkMembers, "findMany"),
//     deleteMany: jest.spyOn(prisma.networkMembers, "deleteMany"),
//     network_delete: jest.spyOn(ztController, "network_delete"),
//     network_detail: jest.spyOn(ztController, "network_detail"),
// };
//   const mockNetworkData = {
//     nwid: "test_nw_id",
//     nwname: "credent_second",
//     authorId: 1,
//   };
//   prismaSpies.findFirst.mockResolvedValue(mockNetworkData);

//   const mockNetworkDetailData: NetworkAndMembers = {
//     network: {
//       nwid: "c8b4f1202b9e9b66",
//       nwname: "credent_second",
//       authorId: 1,
//       authTokens: [null],
//       authorizationEndpoint: "",
//       capabilities: [],
//       clientId: "",
//       creationTime: 1680903852319,
//       dns: [],
//       enableBroadcast: true,
//       id: "c8b4f1202b9e9b66",
//       ipAssignmentPools: [],
//       mtu: 2800,
//       multicastLimit: 32,
//       name: "credent_second",
//       objtype: "network",
//       private: true,
//       remoteTraceLevel: 0,
//       remoteTraceTarget: null,
//       revision: 47,
//       routes: [],
//       rules: [],
//       rulesSource: "",
//       ssoEnabled: false,
//       tags: [],
//       v4AssignMode: { zt: true },
//       v6AssignMode: { "6plane": false, rfc4193: false, zt: false },
//       cidr: [
//         "10.121.15.0/24",
//         "10.121.16.0/24",
//         "10.121.17.0/24",
//         "10.121.18.0/24",
//         "172.25.25.0/24",
//         "172.25.26.0/24",
//         "172.25.27.0/24",
//         "172.25.28.0/24",
//       ],
//     },
//     members: [],
//   };

//   // Mock the network_detail function
//   jest.mock("../../../../utils/ztApi", () => ({
//     network_detail: jest.fn().mockResolvedValue(mockNetworkDetailData),
//   }));

//   // Reset the mocks after the test
//   //   network_detailSpy.mockRestore();
//   //   prismaSpies.findFirst.mockRestore();
//   //   prismaSpies.network_detail.mockResolvedValue(mockNetworkDetailData);

//   //   prismaSpies.findMany.mockRestore();
//   prisma.network.findFirst = jest.fn().mockResolvedValue({
//     nwid: "c8b4f1202b9e9b66",
//     nwname: "credent_second",
//     authorId: 10,
//   });
//   const caller = appRouter.createCaller({
//     session: mockSession as Session,
//     prisma: prisma,
//   });

//   const result = await caller.network.getNetworkById({ nwid: "test_nw_id" });
//   expect(result).toStrictEqual(mockNetworkDetailData);
// });
