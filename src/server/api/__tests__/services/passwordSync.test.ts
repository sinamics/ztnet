/**
 * Pins down the contract that any password write goes to BOTH `User.hash` AND
 * `Account.password`. Pre-fix, the tRPC mutations updated only `User.hash`, and
 * the next sign-in would fail because better-auth verifies against `Account.password`.
 *
 * These tests exercise the tRPC `auth` router via `appRouter.createCaller` —
 * the same surface the frontend uses — so any future mutation that forgets to
 * call `upsertCredentialAccount` will fail here.
 */
import { test, expect, describe, beforeEach } from "@jest/globals";

// Spy on the credential-account service so we can assert it was called.
jest.mock("~/server/api/services/credentialAccountService", () => ({
	upsertCredentialAccount: jest.fn(),
}));

// rate-limit dep imports a real fs module; just stub it.
jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));

jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("~/utils/encryption", () => ({
	encrypt: jest.fn(() => "encrypted"),
	generateInstanceSecret: jest.fn(() => "secret"),
	API_TOKEN_SECRET: "API_TOKEN_SECRET",
	PASSWORD_RESET_SECRET: "PASSWORD_RESET_SECRET",
	VERIFY_EMAIL_SECRET: "VERIFY_EMAIL_SECRET",
	TOTP_MFA_TOKEN_SECRET: "TOTP_MFA_TOKEN_SECRET",
}));

// Don't read /var/lib/zerotier-one/authtoken.secret at module load.
jest.mock("~/utils/ztApi", () => ({
	ping_api: jest.fn(),
}));

import { appRouter } from "../../root";
import type { Session } from "~/lib/authTypes";
import { PrismaClient } from "@prisma/client";
import { type PartialDeep } from "type-fest";
import { upsertCredentialAccount } from "~/server/api/services/credentialAccountService";
import bcrypt from "bcryptjs";

const mockedUpsert = upsertCredentialAccount as jest.MockedFunction<
	typeof upsertCredentialAccount
>;

const session: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	user: {
		id: "user_1",
		name: "Test User",
		email: "test@example.com",
	},
};

function makePrismaMock(user: Record<string, unknown>): PrismaClient {
	const prismaMock = new PrismaClient();
	prismaMock.user.findFirst = jest.fn().mockResolvedValue(user) as never;
	prismaMock.user.findUnique = jest.fn().mockResolvedValue(user) as never;
	prismaMock.user.update = jest.fn().mockResolvedValue(user) as never;
	prismaMock.user.count = jest.fn().mockResolvedValue(1) as never;
	prismaMock.user.create = jest
		.fn()
		.mockResolvedValue({ id: "user_2", name: "x", email: "y" }) as never;
	prismaMock.userGroup.findFirst = jest.fn().mockResolvedValue(null) as never;
	prismaMock.globalOptions.findFirst = jest.fn().mockResolvedValue({
		enableRegistration: true,
		userRegistrationNotification: false,
	}) as never;
	prismaMock.invitation.findUnique = jest.fn() as never;
	prismaMock.invitation.update = jest.fn() as never;
	prismaMock.invitation.delete = jest.fn() as never;
	return prismaMock;
}

describe("auth router password mutations sync Account.password", () => {
	beforeEach(() => {
		mockedUpsert.mockReset();
		mockedUpsert.mockResolvedValue(undefined);
	});

	test("auth.update writes the new hash to Account.password", async () => {
		const oldHash = bcrypt.hashSync("OldPass123!", 10);
		const prisma = makePrismaMock({
			id: "user_1",
			email: "test@example.com",
			name: "Test",
			hash: oldHash,
			accounts: [],
			requestChangePassword: false,
		});

		const caller = appRouter.createCaller({
			session: session as Session,
			wss: null,
			prisma,
			res: { setHeader: jest.fn() } as never,
			req: { headers: {} } as never,
		});

		await caller.auth.update({
			password: "OldPass123!",
			newPassword: "NewPass123!",
			repeatNewPassword: "NewPass123!",
		});

		expect(upsertCredentialAccount).toHaveBeenCalledTimes(1);
		const [userId, hashArg] = mockedUpsert.mock.calls[0];
		expect(userId).toBe("user_1");
		expect(typeof hashArg).toBe("string");
		// Confirm the synced hash actually validates the new password.
		expect(bcrypt.compareSync("NewPass123!", hashArg as string)).toBe(true);
	});

	test("auth.changePasswordFromJwt writes the new hash to Account.password", async () => {
		// Build a valid token signed by the same secret the router will verify with.
		const jwt = await import("jsonwebtoken");
		const token = jwt.sign({ id: "user_1" }, "secret");

		const oldHash = bcrypt.hashSync("OldPass123!", 10);
		const prisma = makePrismaMock({
			id: "user_1",
			email: "test@example.com",
			name: "Test",
			hash: oldHash,
		});

		const caller = appRouter.createCaller({
			session: null,
			wss: null,
			prisma,
			res: { setHeader: jest.fn() } as never,
			req: { headers: {} } as never,
		});

		await caller.auth.changePasswordFromJwt({
			token,
			password: "NewPass123!",
			newPassword: "NewPass123!",
		});

		expect(upsertCredentialAccount).toHaveBeenCalledTimes(1);
		const [userId, hashArg] = mockedUpsert.mock.calls[0];
		expect(userId).toBe("user_1");
		expect(bcrypt.compareSync("NewPass123!", hashArg as string)).toBe(true);
	});

	test("auth.register writes the credential Account row for the new user", async () => {
		const prisma = makePrismaMock({}) as PrismaClient;
		// register() looks up the user first and must return null.
		prisma.user.findFirst = jest.fn().mockResolvedValue(null) as never;
		prisma.user.create = jest.fn().mockResolvedValue({
			id: "user_new",
			name: "New",
			email: "new@example.com",
			expiresAt: null,
			role: "USER",
			memberOfOrgs: [],
		}) as never;

		const caller = appRouter.createCaller({
			session: null,
			wss: null,
			prisma,
			res: { setHeader: jest.fn() } as never,
			req: { headers: {} } as never,
		});

		await caller.auth.register({
			email: "new@example.com",
			password: "BrandNew123!",
			name: "New",
		});

		expect(upsertCredentialAccount).toHaveBeenCalledTimes(1);
		expect(mockedUpsert.mock.calls[0][0]).toBe("user_new");
	});
});
