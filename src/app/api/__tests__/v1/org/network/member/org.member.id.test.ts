import { NextApiRequest, NextApiResponse } from "next";
import apiNetworkUpdateMembersHandler, {
	REQUEST_PR_MINUTE,
} from "~/__pages/api/v1/org/[orgid]/network/[nwid]/member/[memberId]";
import { createGenericApiTests } from "../../../apiAuthentication";

jest.mock("~/server/db", () => ({
	prisma: {
		userOrganizationRole: {
			findFirst: jest.fn().mockResolvedValue({ role: "READ_ONLY" }),
		},
		user: {
			count: jest.fn(),
			create: jest.fn(),
			findUnique: jest.fn().mockResolvedValue({
				id: "userId",
				role: "ADMIN",
				apiTokens: [
					{
						token: "testToken",
						tokenId: "testTokenId",
						expiresAt: new Date(Date.now() + 100000).toISOString(),
					},
				],
			}),
		},
		aPIToken: {
			findUnique: jest.fn().mockResolvedValue({
				expiresAt: new Date(Date.now() + 100000).toISOString(),
				token: "testToken",
				tokenId: "testTokenId",
			}),
		},
	},
}));

describe("organization network members api validation", () => {
	let mockRequest: Partial<NextApiRequest>;
	let mockResponse: Partial<NextApiResponse>;

	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	let jsonResponse: string;

	beforeEach(() => {
		mockRequest = {
			headers: {},
		};
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			setHeader: jest.fn(),
			end: jest.fn(),
			json: jest.fn((result) => {
				jsonResponse = result;
				return mockResponse;
			}),
		};
	});

	describe(
		"Org memberId Test",
		createGenericApiTests(apiNetworkUpdateMembersHandler, "GET"),
	);
	describe(
		"Org memberId Test",
		createGenericApiTests(apiNetworkUpdateMembersHandler, "POST"),
	);
	describe(
		"Org memberId Test",
		createGenericApiTests(apiNetworkUpdateMembersHandler, "DELETE"),
	);

	test("should enforce rate limiting", async () => {
		for (let i = 0; i < REQUEST_PR_MINUTE; i++) {
			mockRequest.headers["x-ztnet-auth"] = `validToken${i}`;
			await apiNetworkUpdateMembersHandler(
				mockRequest as NextApiRequest,
				mockResponse as NextApiResponse,
			);
		}

		// Expect the last request to be rate limited
		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);
		expect(mockResponse.status).toHaveBeenCalledWith(429);
		expect(mockResponse.json).toHaveBeenCalledWith({ error: "Rate limit exceeded" });
	});
});
