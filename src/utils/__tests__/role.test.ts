import { NextApiRequest, NextApiResponse } from "next";
import { checkUserOrganizationRole } from "~/utils/role";

jest.mock("~/utils/apiRouteAuth", () => ({
	SecuredOrganizationApiRoute: (_options: unknown, handler: unknown) => handler,
}));

jest.mock("@prisma/client", () => ({
	Role: { READ_ONLY: 0, USER: 1, MODERATOR: 2, ADMIN: 3 },
}));

jest.mock("~/utils/role", () => ({
	checkUserOrganizationRole: jest.fn().mockResolvedValue(true),
}));

jest.mock("~/utils/errors", () => ({
	handleApiErrors: jest.fn(),
}));

jest.mock("~/server/api/root", () => ({
	appRouter: {
		createCaller: () => ({
			network: {
				getNetworkById: jest.fn().mockResolvedValue({ network: { nwid: "nwid" } }),
				getNetworkMembers: jest.fn().mockResolvedValue({ members: [] }),
			},
		}),
	},
}));

import { GET_orgNetworkMembers as getOrgNetworkMembers } from "~/pages/api/v1/org/[orgid]/network/[nwid]/member";

// `SecuredOrganizationApiRoute` types its return as a two-argument handler,
// but the jest.mock above unwraps it to the inner three-argument handler at
// runtime. Cast to the runtime signature so the mocked context can be passed
// without an argument-count error during type-checking.
type MockedOrgHandler = (
	req: NextApiRequest,
	res: NextApiResponse,
	context: {
		networkId: string;
		orgId: string;
		ctx: { session: { user: { id: string } } };
	},
) => Promise<void>;

const GET_orgNetworkMembers = getOrgNetworkMembers as unknown as MockedOrgHandler;

describe("GET_orgNetworkMembers role check", () => {
	it("requires only READ_ONLY to list organization network members", async () => {
		const req = {} as NextApiRequest;
		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		} as unknown as NextApiResponse;

		await GET_orgNetworkMembers(req, res, {
			networkId: "nwid",
			orgId: "orgId",
			ctx: { session: { user: { id: "userId" } } },
		});

		expect(checkUserOrganizationRole).toHaveBeenCalledWith(
			expect.objectContaining({ minimumRequiredRole: 0 }),
		);
		expect(res.status).toHaveBeenCalledWith(200);
	});
});
