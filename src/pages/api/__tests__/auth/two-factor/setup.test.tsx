import { NextApiRequest, NextApiResponse } from "next";
import handler from "~/pages/api/auth/two-factor/totp/setup";
import { prisma } from "~/server/db";
import { getServerSession } from "next-auth/next";
import { generateInstanceSecret } from "~/utils/encryption";
import { compare } from "bcryptjs";
import { ErrorCode } from "~/utils/errorCode";

jest.mock("~/server/db", () => ({
	prisma: {
		user: {
			findUnique: jest.fn(),
			update: jest.fn(),
		},
	},
}));

jest.mock("next-auth/next", () => ({
	getServerSession: jest.fn(),
}));

jest.mock("~/utils/encryption", () => ({
	encrypt: jest.fn(),
	generateInstanceSecret: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
	compare: jest.fn(),
}));

describe("2FA Enable Endpoint", () => {
	let mockRequest: Partial<NextApiRequest>;
	let mockResponse: Partial<NextApiResponse>;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let jsonResponse: any;
	// let statusCode: number;

	beforeEach(() => {
		jsonResponse = null;
		// statusCode = null;
		mockRequest = {
			method: "POST",
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
		jest.restoreAllMocks();
	});

	it("should return 405 if method is not POST", async () => {
		mockRequest.method = "GET";
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(405);
		expect(mockResponse.json).toHaveBeenCalledWith({ message: "Method not allowed" });
	});

	it("should return 401 if session is not found", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce(null);
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(401);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.InternalServerError,
		});
	});

	it("should return 500 if session user email is missing", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({ user: {} });
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.InternalServerError,
		});
	});

	it("should return 400 if password is incorrect", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			hash: "hashedpassword",
			twoFactorEnabled: false,
		});
		(compare as jest.Mock).mockResolvedValueOnce(false);

		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.IncorrectPassword,
		});
	});

	it("should return 400 if twoFactorEnabled is already true", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			hash: "hashedpassword",
			twoFactorEnabled: true,
		});

		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.TwoFactorAlreadyEnabled,
		});
	});

	it("should return 500 if NEXTAUTH_SECRET is missing", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			hash: "hashedpassword",
			twoFactorEnabled: false,
		});

		// biome-ignore lint/performance/noDelete: <explanation>
		delete process.env.NEXTAUTH_SECRET;

		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.InternalServerError,
		});
	});

	it("should enable 2FA and return secret, keyUri, and dataUri", async () => {
		process.env.NEXTAUTH_SECRET = "test_secret";
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			hash: "hashedpassword",
			twoFactorEnabled: false,
		});
		(compare as jest.Mock).mockResolvedValueOnce(true);
		(generateInstanceSecret as jest.Mock).mockReturnValue("instance_secret");

		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

		expect(jsonResponse).toHaveProperty("secret");
		expect(jsonResponse).toHaveProperty("keyUri");
		expect(jsonResponse).toHaveProperty("dataUri");
	});
});
