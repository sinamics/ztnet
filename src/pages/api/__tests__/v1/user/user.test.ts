import { NextApiRequest, NextApiResponse } from "next";
import createUserHandler from "~/pages/api/v1/user";
import { prisma } from "~/server/db";
import { appRouter } from "~/server/api/root";
import { API_TOKEN_SECRET, encrypt, generateInstanceSecret } from "~/utils/encryption";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";

jest.mock("~/server/api/root", () => ({
	appRouter: {
		createCaller: jest.fn(() => ({
			auth: {
				// Mock the mutation method used in your authRouter
				register: jest.fn().mockImplementation(() => ({
					mutation: jest.fn().mockResolvedValue({}),
				})),
			},
		})),
	},
}));
jest.mock("~/utils/rateLimit", () => ({
	__esModule: true,
	default: () => ({
		check: jest.fn().mockResolvedValue(true),
	}),
}));
jest.mock("~/server/api/trpc");

jest.mock("~/server/db", () => ({
	prisma: {
		user: {
			count: jest.fn(),
			create: jest.fn(),
			findUnique: jest.fn().mockResolvedValue({
				id: "userId",
				role: "ADMIN",
				apiTokens: [
					{
						// Assuming your actual `apiTokens` structure looks something like this
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

describe("createUserHandler", () => {
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
		};
		mockResponse = {
			status: jest.fn().mockReturnThis(),
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
	// Helper function to create a mock response object
	const createMockRes = () =>
		({
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(),
		}) as unknown as NextApiResponse;

	it('should throw "Invalid Authorization Type" for mismatched authorization types', async () => {
		// Mock encrypted token string and secret to return a specific payload that simulates mismatched authorization type
		const requireAdmin = false;
		const apiAuthorizationType = AuthorizationType.PERSONAL;

		// Mock decrypt function to return a payload that simulates a mismatched authorization type
		const tokendata = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["ORGANIZATION"],
		});

		const tokenWithIdHash = encrypt(tokendata, generateInstanceSecret(API_TOKEN_SECRET));

		try {
			await decryptAndVerifyToken({
				apiKey: tokenWithIdHash,
				requireAdmin,
				apiAuthorizationType,
			});
		} catch (error) {
			expect(error.message).toBe("Invalid Authorization Type");
		}
	});

	test("Allow creating new user if user count is 0", async () => {
		prisma.user.count = jest.fn().mockResolvedValue(0);
		// mock prisma transaction
		prisma.$transaction = jest
			.fn()
			.mockResolvedValue({ id: "newUserId", name: "Ztnet", email: "post@ztnet.network" });

		// Mocking the decryptAndVerifyToken function to throw an error for the test case
		jest.mock("~/utils/encryption", () => ({
			decryptAndVerifyToken: jest.fn().mockImplementation(() => {
				throw new Error("Invalid Authorization Type");
			}),
		}));

		mockRequest.method = "POST";
		mockRequest.headers["x-ztnet-auth"] = "not defined";
		mockRequest.body = {
			email: "ztnet@example.com",
			password: "password123",
			name: "Ztnet",
		};

		await createUserHandler(
			mockRequest as NextApiRequest,
			mockResponse as NextApiResponse,
		);

		expect(mockResponse.status).toHaveBeenCalledWith(200);

		// Check if the response is as expected
		expect(mockResponse.json).toHaveBeenCalledWith({
			id: "newUserId",
			name: "Ztnet",
			email: "post@ztnet.network",
		});
	});

	it("should create a user successfully", async () => {
		prisma.user.count = jest.fn().mockResolvedValue(10);

		// mock prisma transaction
		prisma.$transaction = jest.fn().mockResolvedValue({ id: "newUserId" });

		// Mock decrypt function to return a payload that simulates a mismatched authorization type
		const decryptedTokenData = JSON.stringify({
			userId: "testUserId",
			tokenId: "testTokenId",
			apiAuthorizationType: ["PERSONAL"],
		});

		const tokenWithIdHash = encrypt(
			decryptedTokenData,
			generateInstanceSecret(API_TOKEN_SECRET),
		);

		const mockRegister = jest.fn().mockResolvedValue({ id: "newUserId" });
		appRouter.createCaller = jest
			.fn()
			.mockReturnValue({ auth: { register: mockRegister } });

		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": tokenWithIdHash },
			body: { email: "test@example.com", password: "password123", name: "Test User" },
			query: {},
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(),
		} as unknown as NextApiResponse;

		await createUserHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ id: "newUserId" });
	});

	it("should respond 401 when decryptAndVerifyToken fails", async () => {
		prisma.user.count = jest.fn().mockResolvedValue(1);

		// mock prisma transaction
		prisma.$transaction = jest.fn().mockResolvedValue({ id: "newUserId" });

		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "invalidApiKey" },
			query: { id: "networkId" },
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(), // Mock `setHeader` if rate limiter uses it
		} as unknown as NextApiResponse;

		await createUserHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
	});

	it("should allow only POST method", async () => {
		const methods = ["GET", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
		const req = {
			query: {},
		} as NextApiRequest;
		const res = createMockRes();

		for (const method of methods) {
			req.method = method;
			await createUserHandler(req, res);

			expect(res.status).toHaveBeenCalledWith(405);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ error: "Method Not Allowed" }),
			);
		}
	});
});
