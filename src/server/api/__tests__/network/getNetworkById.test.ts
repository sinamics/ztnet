import { PrismaClient } from "@prisma/client";
import { type Session } from "next-auth";
import { appRouter } from "../../root";
import { type PartialDeep } from "type-fest";
import { TRPCError } from "@trpc/server";

const prisma = new PrismaClient();
const mockSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	update: { name: "test" },
	user: {
		id: "userid",
		name: "Bernt Christian",
		email: "mail@gmail.com",
	},
};

it("should throw an error if the user is not the author of the network", async () => {
	prisma.network.findFirst = jest.fn().mockRejectedValue(
		new TRPCError({
			message: "Network not found!",
			code: "BAD_REQUEST",
		}),
	);

	const caller = appRouter.createCaller({
		session: mockSession as Session,
		wss: null,
		prisma: prisma,
	});
	try {
		await caller.network.getNetworkById({ nwid: "test_nw_id" });
	} catch (error) {
		expect(error.message).toBe("Network not found!");
		expect(error.code).toBe("BAD_REQUEST");
	}
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
