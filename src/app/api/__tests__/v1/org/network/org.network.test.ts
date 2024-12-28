import { NextApiRequest, NextApiResponse } from "next";
import apiNetworkHandler, {
	REQUEST_PR_MINUTE,
} from "~/__pages/api/v1/org/[orgid]/network";
import { createGenericApiTests } from "../../apiAuthentication";

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
						expiresAt: new Date(Date.now() + 100000).toISOString(), // Simulate a future expiration
					},
				],
			}),
		},
		aPIToken: {
			findUnique: jest.fn().mockResolvedValue({
				expiresAt: new Date(Date.now() + 100000).toISOString(), // Simulate a future expiration
				token: "testToken",
				tokenId: "testTokenId",
			}),
		},
	},
}));

describe("organization network api validation", () => {
	let mockRequest: Partial<NextApiRequest>;
	let mockResponse: Partial<NextApiResponse>;

	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	let jsonResponse: string;
	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	let statusCode: number;

	beforeEach(() => {
		jsonResponse = null;
		statusCode = null;
		mockRequest = {
			headers: {},
			body: {},
			query: {}, // Reset query to an empty object
			method: "GET", // Default method can be set here if most tests use the same method, otherwise set it in individual tests
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
	afterEach(() => {
		// Restores all mocks back to their original value.
		// only works when the mock was created with jest.spyOn;
		jest.restoreAllMocks();
	});

	describe("NetworkById GET tests ", createGenericApiTests(apiNetworkHandler, "GET"));
	describe("NetworkById PORT tests ", createGenericApiTests(apiNetworkHandler, "POST"));

	test("should enforce rate limiting", async () => {
		for (let i = 0; i < REQUEST_PR_MINUTE; i++) {
			mockRequest.headers["x-ztnet-auth"] = `validToken${i}`;
			await apiNetworkHandler(
				mockRequest as NextApiRequest,
				mockResponse as NextApiResponse,
			);
		}

		// Expect the last request to be rate limited
		await apiNetworkHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);
		expect(mockResponse.status).toHaveBeenCalledWith(429);
		expect(mockResponse.json).toHaveBeenCalledWith({ error: "Rate limit exceeded" });
	});
});
