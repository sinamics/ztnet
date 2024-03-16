import { NextApiRequest, NextApiResponse } from "next";
import createUserHandler from "~/pages/api/v1/user";
import { prisma } from "~/server/db";
import * as encryptionModule from "~/utils/encryption";
import { appRouter } from "~/server/api/root";

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

jest.mock("~/utils/encryption");
jest.mock("~/server/api/trpc");

jest.mock("~/server/db", () => ({
	prisma: {
		user: {
			count: jest.fn(),
			create: jest.fn(),
		},
	},
}));

describe("createUserHandler", () => {
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

	it("should create a user successfully", async () => {
		prisma.user.count = jest.fn().mockResolvedValue(0);

		// mock prisma transaction
		prisma.$transaction = jest.fn().mockResolvedValue({ id: "newUserId" });

		// Mock the decryption to fail
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: "userId",
		});

		const mockRegister = jest.fn().mockResolvedValue({ id: "newUserId" });
		appRouter.createCaller = jest
			.fn()
			.mockReturnValue({ auth: { register: mockRegister } });

		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "validApiKey" },
			body: { email: "test@example.com", password: "password123", name: "Test User" },
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

		// Mock the decryption to fail
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockRejectedValue(
			new Error("Invalid token"),
		);

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
		const req = {} as NextApiRequest;
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
