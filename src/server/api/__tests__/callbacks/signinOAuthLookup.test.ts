import { signInCallback } from "~/server/callbacks/signin";
import { prisma } from "~/server/db";
import { IncomingMessage } from "http";
import { GetServerSidePropsContext } from "next";

// Mock all external dependencies
jest.mock("~/server/db", () => ({
	prisma: {
		account: {
			findUnique: jest.fn(),
		},
		user: {
			findUnique: jest.fn(),
			update: jest.fn(),
			count: jest.fn(),
			create: jest.fn(),
		},
		userDevice: {
			findUnique: jest.fn(),
			upsert: jest.fn(),
		},
		userGroup: {
			findFirst: jest.fn(),
		},
		globalOptions: {
			findFirst: jest.fn(),
		},
	},
}));

jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("~/utils/docker", () => ({
	isRunningInDocker: jest.fn().mockReturnValue(false),
}));

jest.mock("~/utils/devices", () => ({
	DEVICE_SALT_COOKIE_NAME: "zt_device_salt",
	createDeviceCookie: jest.fn(),
	parseUA: jest.fn().mockReturnValue({
		deviceType: "desktop",
		browser: "Chrome",
		os: "Linux",
	}),
}));

const mockUser = {
	id: "user-1",
	name: "Test User",
	email: "old@gmail.com",
	role: "USER",
	isActive: true,
	expiresAt: null,
	userGroup: null,
	firstTime: false,
};

const mockRequest = {
	headers: {
		"user-agent": "test-agent",
		cookie: "",
	},
	socket: { remoteAddress: "127.0.0.1" },
	cookies: {},
} as unknown as IncomingMessage & { cookies: Partial<{ [key: string]: string }> };

const mockResponse = {
	setHeader: jest.fn(),
} as unknown as GetServerSidePropsContext["res"];

describe("signInCallback - OAuth providerAccountId lookup", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Default: device tracking mocks
		(prisma.userDevice.findUnique as jest.Mock).mockResolvedValue(null);
		(prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});
		(prisma.user.update as jest.Mock).mockResolvedValue({});
	});

	it("should find existing user by providerAccountId when email has changed", async () => {
		// The user renamed their Gmail from old@gmail.com to new@gmail.com
		// The Account table still links providerAccountId "google-sub-123" to user-1
		(prisma.account.findUnique as jest.Mock).mockResolvedValue({
			userId: "user-1",
		});

		// User found by ID from linked account
		(prisma.user.findUnique as jest.Mock).mockImplementation(({ where, select }) => {
			if (where.id === "user-1" && !select) {
				return Promise.resolve({ ...mockUser });
			}
			// For device info lookup
			if (select?.email) {
				return Promise.resolve({
					email: "new@gmail.com",
					id: "user-1",
					firstTime: false,
				});
			}
			return Promise.resolve(null);
		});

		const signIn = signInCallback(mockRequest, mockResponse);
		const result = await signIn({
			user: { id: "user-1", name: "Test User", email: "new@gmail.com" },
			account: {
				provider: "oauth",
				providerAccountId: "google-sub-123",
			},
			profile: {},
		});

		expect(result).toBe(true);

		// Should have looked up by providerAccountId
		expect(prisma.account.findUnique).toHaveBeenCalledWith({
			where: {
				provider_providerAccountId: {
					provider: "oauth",
					providerAccountId: "google-sub-123",
				},
			},
			select: { userId: true },
		});

		// Should NOT have done an email lookup (user was found by account link)
		const userFindCalls = (prisma.user.findUnique as jest.Mock).mock.calls;
		const emailLookup = userFindCalls.find((call) => call[0]?.where?.email);
		expect(emailLookup).toBeUndefined();

		// Should have updated the email to the new one
		expect(prisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "user-1" },
				data: { email: "new@gmail.com" },
			}),
		);
	});

	it("should NOT update email when it has not changed", async () => {
		(prisma.account.findUnique as jest.Mock).mockResolvedValue({
			userId: "user-1",
		});

		(prisma.user.findUnique as jest.Mock).mockImplementation(({ where, select }) => {
			if (where.id === "user-1" && !select) {
				return Promise.resolve({ ...mockUser });
			}
			if (select?.email) {
				return Promise.resolve({
					email: "old@gmail.com",
					id: "user-1",
					firstTime: false,
				});
			}
			return Promise.resolve(null);
		});

		const signIn = signInCallback(mockRequest, mockResponse);
		await signIn({
			user: { id: "user-1", name: "Test User", email: "old@gmail.com" },
			account: {
				provider: "oauth",
				providerAccountId: "google-sub-123",
			},
			profile: {},
		});

		// Should NOT have updated the email (it's the same)
		const updateCalls = (prisma.user.update as jest.Mock).mock.calls;
		const emailUpdateCall = updateCalls.find((call) => call[0]?.data?.email);
		expect(emailUpdateCall).toBeUndefined();
	});

	it("should fall back to email lookup when no linked account exists (first-time OAuth)", async () => {
		// No linked account found (first-time OAuth user)
		(prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

		// User found by email
		(prisma.user.findUnique as jest.Mock).mockImplementation(({ where, select }) => {
			if (where.email === "existing@gmail.com") {
				return Promise.resolve({ ...mockUser, email: "existing@gmail.com" });
			}
			if (select?.email) {
				return Promise.resolve({
					email: "existing@gmail.com",
					id: "user-1",
					firstTime: false,
				});
			}
			return Promise.resolve(null);
		});

		const signIn = signInCallback(mockRequest, mockResponse);
		const result = await signIn({
			user: { id: "user-1", name: "Test User", email: "existing@gmail.com" },
			account: {
				provider: "oauth",
				providerAccountId: "google-sub-456",
			},
			profile: {},
		});

		expect(result).toBe(true);

		// Should have attempted providerAccountId lookup first
		expect(prisma.account.findUnique).toHaveBeenCalled();

		// Should have fallen back to email lookup
		const userFindCalls = (prisma.user.findUnique as jest.Mock).mock.calls;
		const emailLookup = userFindCalls.find((call) => call[0]?.where?.email);
		expect(emailLookup).toBeDefined();
	});

	it("should skip providerAccountId lookup for credentials provider", async () => {
		(prisma.user.findUnique as jest.Mock).mockImplementation(({ where, select }) => {
			if (where.email === "test@example.com") {
				return Promise.resolve({ ...mockUser, email: "test@example.com" });
			}
			if (select?.email) {
				return Promise.resolve({
					email: "test@example.com",
					id: "user-1",
					firstTime: false,
				});
			}
			return Promise.resolve(null);
		});

		const signIn = signInCallback(mockRequest, mockResponse);
		const result = await signIn({
			user: {
				id: "user-1",
				name: "Test User",
				email: "test@example.com",
				userAgent: "test-agent",
			},
			account: { provider: "credentials" },
			profile: {},
		});

		expect(result).toBe(true);

		// Should NOT have queried the account table
		expect(prisma.account.findUnique).not.toHaveBeenCalled();
	});

	it("should create new user when no linked account and no email match", async () => {
		// Enable OAuth registration
		process.env.OAUTH_ALLOW_NEW_USERS = "true";
		process.env.OAUTH_EXCLUSIVE_LOGIN = "true";

		// No linked account
		(prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

		// No user found by email either
		(prisma.user.findUnique as jest.Mock).mockImplementation(({ where, select }) => {
			if (where.id === "new-user-1") {
				return Promise.resolve({
					...mockUser,
					id: "new-user-1",
					email: "brand-new@gmail.com",
				});
			}
			if (select?.email) {
				return Promise.resolve({
					email: "brand-new@gmail.com",
					id: "new-user-1",
					firstTime: true,
				});
			}
			return Promise.resolve(null);
		});

		(prisma.user.count as jest.Mock).mockResolvedValue(1);
		(prisma.userGroup.findFirst as jest.Mock).mockResolvedValue(null);
		(prisma.user.create as jest.Mock).mockResolvedValue({
			id: "new-user-1",
			name: "brand-new",
			email: "brand-new@gmail.com",
			role: "USER",
		});
		(prisma.globalOptions.findFirst as jest.Mock).mockResolvedValue({
			enableRegistration: true,
		});

		const signIn = signInCallback(mockRequest, mockResponse);
		const result = await signIn({
			user: { id: "temp", name: "brand-new", email: "brand-new@gmail.com" },
			account: {
				provider: "oauth",
				providerAccountId: "google-sub-789",
			},
			profile: {},
		});

		expect(result).toBe(true);

		// Should have created a new user
		expect(prisma.user.create).toHaveBeenCalled();
	});
});
