import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { API_TOKEN_SECRET, encrypt, generateInstanceSecret } from "~/utils/encryption";
import apiNetworkUpdateMembersHandler, {
	DELETE_orgStashNetworkMember,
	GET_orgNetworkMemberById,
	POST_orgUpdateNetworkMember,
	REQUEST_PR_MINUTE,
} from "~/pages/api/v1/org/[orgid]/network/[nwid]/member/[memberId]";

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

describe("organization network members api validation", () => {
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
	test('POST_orgUpdateNetworkMember should throw "Invalid Token"', async () => {
		// mock req.query?.orgid
		mockRequest.query = { orgid: "testOrgId", nwid: "testNetworkId" };

		prisma.user.count = jest.fn().mockResolvedValue(0);
		// mock prisma transaction
		prisma.$transaction = jest
			.fn()
			.mockResolvedValue({ id: "newUserId", name: "Ztnet", email: "post@ztnet.network" });

		mockRequest.headers["x-ztnet-auth"] = "not valid token";

		await POST_orgUpdateNetworkMember(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);
		expect(mockResponse.status).toHaveBeenCalledWith(401);
		// check if the response is correct. invalid token
		expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid token" });
	});

	test('POST_orgUpdateNetworkMember should throw "Invalid Authorization Type" for mismatched authorization types', async () => {
		// Mock decrypt function to return a payload that simulates a mismatched authorization type
		const tokendata = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["PERSONAL"],
		});

		const tokenWithIdHash = encrypt(tokendata, generateInstanceSecret(API_TOKEN_SECRET));
		mockRequest.headers["x-ztnet-auth"] = tokenWithIdHash;
		try {
			await POST_orgUpdateNetworkMember(
				mockRequest as NextApiRequest,
				mockResponse as NextApiResponse,
			);
		} catch (error) {
			expect(error.message).toBe("Invalid Authorization Type");
		}
	});

	test('DELETE_orgStashNetworkMember should throw "Invalid Token"', async () => {
		// mock req.query?.orgid
		mockRequest.query = { orgid: "testOrgId", nwid: "testNetworkId" };

		prisma.user.count = jest.fn().mockResolvedValue(0);
		// mock prisma transaction
		prisma.$transaction = jest
			.fn()
			.mockResolvedValue({ id: "newUserId", name: "Ztnet", email: "post@ztnet.network" });

		mockRequest.headers["x-ztnet-auth"] = "not valid token";

		await DELETE_orgStashNetworkMember(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);
		expect(mockResponse.status).toHaveBeenCalledWith(401);
		// check if the response is correct. invalid token
		expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid token" });
	});

	test('DELETE_orgStashNetworkMember should throw "Invalid Authorization Type" for mismatched authorization types', async () => {
		// Mock decrypt function to return a payload that simulates a mismatched authorization type
		const tokendata = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["PERSONAL"],
		});

		const tokenWithIdHash = encrypt(tokendata, generateInstanceSecret(API_TOKEN_SECRET));
		mockRequest.headers["x-ztnet-auth"] = tokenWithIdHash;
		try {
			await DELETE_orgStashNetworkMember(
				mockRequest as NextApiRequest,
				mockResponse as NextApiResponse,
			);
		} catch (error) {
			expect(error.message).toBe("Invalid Authorization Type");
		}
	});

	test('GET_orgNetworkMemberById should throw "Invalid Token"', async () => {
		// mock req.query?.orgid
		mockRequest.query = { orgid: "testOrgId", nwid: "testNetworkId" };

		prisma.user.count = jest.fn().mockResolvedValue(0);
		// mock prisma transaction
		prisma.$transaction = jest
			.fn()
			.mockResolvedValue({ id: "newUserId", name: "Ztnet", email: "post@ztnet.network" });

		mockRequest.headers["x-ztnet-auth"] = "not valid token";

		await GET_orgNetworkMemberById(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);
		expect(mockResponse.status).toHaveBeenCalledWith(401);
		// check if the response is correct. invalid token
		expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid token" });
	});

	test('GET_orgNetworkMemberById should throw "Invalid Authorization Type" for mismatched authorization types', async () => {
		// Mock decrypt function to return a payload that simulates a mismatched authorization type
		const tokendata = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["PERSONAL"],
		});

		const tokenWithIdHash = encrypt(tokendata, generateInstanceSecret(API_TOKEN_SECRET));
		mockRequest.headers["x-ztnet-auth"] = tokenWithIdHash;
		try {
			await GET_orgNetworkMemberById(
				mockRequest as NextApiRequest,
				mockResponse as NextApiResponse,
			);
		} catch (error) {
			expect(error.message).toBe("Invalid Authorization Type");
		}
	});

	test("should deny access if member is not tied to organization", async () => {
		// add organizationId to the request
		mockRequest.query = {
			orgid: "testOrgId",
			nwid: "testNetworkId",
			memberId: "testMemberId",
		};

		// Mock an API token with an unauthorized role
		const unauthorizedTokenData = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["ORGANIZATION"],
		});

		const unauthorizedToken = encrypt(
			unauthorizedTokenData,
			generateInstanceSecret(API_TOKEN_SECRET),
		);

		prisma.aPIToken.findUnique = jest.fn().mockResolvedValue({
			expiresAt: new Date(Date.now() + 100000).toISOString(),
			token: unauthorizedToken,
			userId: "testUserId",
			tokenId: "testTokenId",
		});

		// return null, as this user is not a member of the organization
		prisma.userOrganizationRole.findFirst = jest.fn().mockResolvedValue(null);

		mockRequest.headers["x-ztnet-auth"] = unauthorizedToken;

		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			message:
				"You are not a member of this organization. Contact your organization administrator to request access.",
		});
	});
	test("should deny access if member has read_only role for POST", async () => {
		// add organizationId to the request
		mockRequest.query = {
			orgid: "testOrgId",
			nwid: "testNetworkId",
			memberId: "testMemberId",
		};
		// Mock an API token with an unauthorized role
		const unauthorizedTokenData = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["ORGANIZATION"],
		});

		const unauthorizedToken = encrypt(
			unauthorizedTokenData,
			generateInstanceSecret(API_TOKEN_SECRET),
		);

		prisma.aPIToken.findUnique = jest.fn().mockResolvedValue({
			expiresAt: new Date(Date.now() + 100000).toISOString(),
			token: unauthorizedToken,
			userId: "testUserId",
			tokenId: "testTokenId",
		});

		// return null, as this user is not a member of the organization
		prisma.userOrganizationRole.findFirst = jest
			.fn()
			.mockResolvedValue({ role: "READ_ONLY" });

		mockRequest.headers["x-ztnet-auth"] = unauthorizedToken;

		// set req.method to POST
		mockRequest.method = "POST";
		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			message:
				"You don't have required permission to perform this action. Contact your organization administrator to request access.",
		});

		// set req.method to DELETE
		mockRequest.method = "DELETE";
		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			message:
				"You don't have required permission to perform this action. Contact your organization administrator to request access.",
		});
	});
	test("should deny access if member has READ_ONLY role for DELETE", async () => {
		// add organizationId to the request
		mockRequest.query = {
			orgid: "testOrgId",
			nwid: "testNetworkId",
			memberId: "testMemberId",
		};
		// Mock an API token with an unauthorized role
		const unauthorizedTokenData = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["ORGANIZATION"],
		});

		const unauthorizedToken = encrypt(
			unauthorizedTokenData,
			generateInstanceSecret(API_TOKEN_SECRET),
		);

		prisma.aPIToken.findUnique = jest.fn().mockResolvedValue({
			expiresAt: new Date(Date.now() + 100000).toISOString(),
			token: unauthorizedToken,
			userId: "testUserId",
			tokenId: "testTokenId",
		});

		// return null, as this user is not a member of the organization
		prisma.userOrganizationRole.findFirst = jest
			.fn()
			.mockResolvedValue({ role: "READ_ONLY" });

		mockRequest.headers["x-ztnet-auth"] = unauthorizedToken;

		// set req.method to DELETE
		mockRequest.method = "DELETE";
		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			message:
				"You don't have required permission to perform this action. Contact your organization administrator to request access.",
		});
	});
	test("should respond with bad request for missing orgid", async () => {
		// reset the request headers
		mockRequest.query = null;

		mockRequest.query = {
			orgid: null,
			nwid: "testNetworkId",
			memberId: "testMemberId",
		};

		const validTokenData = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["ORGANIZATION"],
		});

		// set req.method to GET
		mockRequest.method = "GET";
		prisma.userOrganizationRole.findFirst = jest.fn().mockResolvedValue({ role: "USER" });

		const validToken = encrypt(validTokenData, generateInstanceSecret(API_TOKEN_SECRET));
		mockRequest.headers["x-ztnet-auth"] = validToken;

		// add organizationId to the request
		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: "Organization ID is required",
		});

		// set req.method to POST
		mockRequest.method = "POST";
		await apiNetworkUpdateMembersHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: "Organization ID is required",
		});
	});

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
