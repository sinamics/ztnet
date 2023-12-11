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
	it("should create a user successfully", async () => {
		prisma.user.count = jest.fn().mockResolvedValue(0);

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
});
