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

import { GET_orgNetworkMembers } from "~/pages/api/v1/org/[orgid]/network/[nwid]/member";

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
		} as never);

		expect(checkUserOrganizationRole).toHaveBeenCalledWith(
			expect.objectContaining({ minimumRequiredRole: 0 }),
		);
		expect(res.status).toHaveBeenCalledWith(200);
	});
});
