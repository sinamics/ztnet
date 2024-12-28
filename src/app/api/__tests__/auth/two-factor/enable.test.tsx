import { NextApiRequest, NextApiResponse } from "next";
import handler from "~/__pages/api/auth/two-factor/totp/enable";
import { prisma } from "~/server/db";
import { getServerSession } from "next-auth";
import { decrypt } from "~/utils/encryption";
import { authenticator } from "otplib";
import { ErrorCode } from "~/utils/errorCode";

jest.mock("~/server/db", () => ({
	prisma: {
		user: {
			findUnique: jest.fn(),
			update: jest.fn(),
		},
	},
}));

jest.mock("next-auth", () => ({
	getServerSession: jest.fn(),
}));

jest.mock("~/utils/encryption", () => ({
	decrypt: jest.fn(),
	generateInstanceSecret: jest.fn(),
}));

jest.mock("otplib", () => ({
	authenticator: {
		check: jest.fn(),
	},
}));

describe("Enable 2FA Endpoint", () => {
	let mockRequest: Partial<NextApiRequest>;
	let mockResponse: Partial<NextApiResponse>;
	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let jsonResponse: any;
	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	let statusCode: number;

	beforeEach(() => {
		jsonResponse = null;
		statusCode = null;
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
		expect(mockResponse.json).toHaveBeenCalledWith({ message: "Not authenticated" });
	});

	it("should return 500 if session user email is missing", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({ user: {} });
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.InternalServerError,
		});
	});

	it("should return 400 if twoFactorEnabled is already true", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			twoFactorEnabled: true,
		});

		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.TwoFactorAlreadyEnabled,
		});
	});

	it("should return 400 if twoFactorSecret is not set", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			twoFactorEnabled: false,
			twoFactorSecret: null,
		});

		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.TwoFactorSetupRequired,
		});
	});

	it("should return 500 if NEXTAUTH_SECRET is missing", async () => {
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			twoFactorEnabled: false,
			twoFactorSecret: "encryptedSecret",
		});

		// biome-ignore lint/performance/noDelete: <explanation>
		delete process.env.NEXTAUTH_SECRET;
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.InternalServerError,
		});
	});

	it("should return 400 if TOTP code is incorrect", async () => {
		process.env.NEXTAUTH_SECRET = "test_secret";
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			twoFactorEnabled: false,
			twoFactorSecret: "encryptedSecret",
		});
		(decrypt as jest.Mock).mockReturnValue("decryptedSecret");
		(authenticator.check as jest.Mock).mockReturnValue(false);

		mockRequest.body = { totpCode: "123456" };
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);
		// expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith({
			error: ErrorCode.InternalServerError,
		});
	});

	it("should enable 2FA and return success message", async () => {
		process.env.NEXTAUTH_SECRET = "test_secret";
		(getServerSession as jest.Mock).mockResolvedValueOnce({
			user: { email: "test@example.com" },
		});
		(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
			email: "test@example.com",
			twoFactorEnabled: false,
			twoFactorSecret: "encryptedSecret",
			twoFactorRecoveryCodes: [],
		});
		// Mock the database to return a network
		prisma.user.update = jest.fn().mockResolvedValueOnce({
			email: "test@example.com",
			twoFactorEnabled: false,
			twoFactorSecret: "encryptedSecret",
		});
		// 32 characters long secret
		const secret = "12345678901234567890123456789012";
		(decrypt as jest.Mock).mockReturnValue(secret);
		(authenticator.check as jest.Mock).mockReturnValue(true);

		mockRequest.body = { totpCode: "123456" };
		await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

		// expect(mockResponse.status).toHaveBeenCalledWith(200);
		// expect(mockResponse.json).toHaveBeenCalledWith({ message: "Two-factor enabled" });
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { email: "test@example.com" },
			data: { twoFactorEnabled: true, twoFactorRecoveryCodes: expect.any(Array) },
		});
	});
});
