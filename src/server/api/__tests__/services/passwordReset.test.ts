/**
 * Password reset links must be database backed and single use.
 *
 * Before this, a reset link was a JWT signed with a key derived from
 * NEXTAUTH_SECRET and checked only by signature. On an install running a known
 * secret, anyone who knew a user id could set that user's password. These tests
 * drive the real auth router against an in memory Verification table.
 */
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "../../root";
import { sendMailWithTemplate } from "~/utils/mail";
import { upsertCredentialAccount } from "~/server/api/services/credentialAccountService";

jest.mock("~/server/api/services/credentialAccountService", () => ({
	upsertCredentialAccount: jest.fn(),
}));
jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("~/utils/ztApi", () => ({
	ping_api: jest.fn(),
}));

type Row = { id: string; identifier: string; value: string; expiresAt: Date };
type Where = {
	id?: string;
	identifier?: string | { startsWith: string };
	value?: { startsWith: string };
	expiresAt?: { gt?: Date; lte?: Date };
	OR?: Where[];
};
type TestUser = { id: string; email: string; hash: string | null };

const matches = (row: Row, where: Where): boolean => {
	if (where.id !== undefined && row.id !== where.id) return false;
	if (typeof where.identifier === "string" && row.identifier !== where.identifier)
		return false;
	if (
		typeof where.identifier === "object" &&
		!row.identifier.startsWith(where.identifier.startsWith)
	)
		return false;
	if (where.value && !row.value.startsWith(where.value.startsWith)) return false;
	if (where.expiresAt?.gt && !(row.expiresAt > where.expiresAt.gt)) return false;
	if (where.expiresAt?.lte && !(row.expiresAt <= where.expiresAt.lte)) return false;
	if (where.OR && !where.OR.some((w) => matches(row, w))) return false;
	return true;
};

function setup() {
	let rows: Row[] = [];
	let seq = 0;
	const users: TestUser[] = [
		{ id: "cluser1", email: "victim@example.com", hash: "old-hash" },
		{ id: "cluser2", email: "other@example.com", hash: "other-hash" },
	];

	const prisma = new PrismaClient();
	prisma.verification.create = jest.fn(async ({ data }: { data: Omit<Row, "id"> }) => {
		const row = { id: `v${++seq}`, ...data };
		rows.push(row);
		return row;
	}) as never;
	prisma.verification.findFirst = jest.fn(
		async ({ where }: { where: Where }) => rows.find((r) => matches(r, where)) ?? null,
	) as never;
	prisma.verification.deleteMany = jest.fn(async ({ where }: { where: Where }) => {
		const before = rows.length;
		rows = rows.filter((r) => !matches(r, where));
		return { count: before - rows.length };
	}) as never;
	prisma.user.findFirst = jest.fn(
		async ({ where }: { where: { id?: string; email?: string } }) =>
			users.find(
				(u) =>
					(where.id === undefined || u.id === where.id) &&
					(where.email === undefined || u.email === where.email),
			) ?? null,
	) as never;
	prisma.user.update = jest.fn(
		async ({ where, data }: { where: { id: string }; data: Partial<TestUser> }) => {
			const user = users.find((u) => u.id === where.id);
			Object.assign(user, data);
			return user;
		},
	) as never;

	const caller = appRouter.createCaller({
		session: null,
		wss: null,
		prisma,
		res: { setHeader: jest.fn() } as never,
		req: { headers: {} } as never,
	});

	const requestLink = async (email: string) => {
		const mailMock = sendMailWithTemplate as jest.Mock;
		const callsBefore = mailMock.mock.calls.length;
		await caller.auth.passwordResetLink({ email });
		const link: string = mailMock.mock.calls[callsBefore][1].templateData.forgotLink;
		return decodeURIComponent(link.split("token=")[1]);
	};

	const reset = (token: string) =>
		caller.auth.changePasswordFromJwt({
			token,
			password: "NewPass123!",
			newPassword: "NewPass123!",
		});

	return { caller, prisma, users, rows: () => rows, requestLink, reset };
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("password reset links", () => {
	it("work exactly once", async () => {
		const { caller, users, requestLink, reset } = setup();
		const token = await requestLink("victim@example.com");

		await expect(caller.auth.validateResetPasswordToken({ token })).resolves.toEqual({
			email: "victim@example.com",
		});

		await reset(token);
		expect(users[0].hash).not.toBe("old-hash");
		expect(upsertCredentialAccount).toHaveBeenCalledWith("cluser1", users[0].hash);

		const hashAfterFirstReset = users[0].hash;
		await expect(reset(token)).rejects.toThrow();
		expect(users[0].hash).toBe(hashAfterFirstReset);
		await expect(
			caller.auth.validateResetPasswordToken({ token }),
		).resolves.toHaveProperty("error");
	});

	it("refuses a token forged with the old public secret", async () => {
		const { caller, prisma, reset } = setup();
		// The pre-fix token format, signed with the key the old code derived from "random_secret".
		const key = createHash("sha256")
			.update("random_secret")
			.update("_ztnet_passwd_reset")
			.digest();
		const forged = jwt.sign({ id: "cluser1", email: "victim@example.com" }, key, {
			expiresIn: "15m",
		});

		await expect(
			caller.auth.validateResetPasswordToken({ token: forged }),
		).resolves.toHaveProperty("error");
		await expect(reset(forged)).rejects.toThrow();
		expect(prisma.user.update).not.toHaveBeenCalled();
	});

	it("are revoked when a newer link is requested", async () => {
		const { users, requestLink, reset } = setup();
		const first = await requestLink("victim@example.com");
		const second = await requestLink("victim@example.com");

		await expect(reset(first)).rejects.toThrow();
		expect(users[0].hash).toBe("old-hash");
		await reset(second);
		expect(users[0].hash).not.toBe("old-hash");
	});

	it("do not revoke links issued to other users", async () => {
		const { users, requestLink, reset } = setup();
		const victimToken = await requestLink("victim@example.com");
		await requestLink("other@example.com");

		await reset(victimToken);
		expect(users[0].hash).not.toBe("old-hash");
	});

	it("expire", async () => {
		const { caller, users, rows, requestLink, reset } = setup();
		const token = await requestLink("victim@example.com");
		rows()[0].expiresAt = new Date(Date.now() - 1000);

		await expect(
			caller.auth.validateResetPasswordToken({ token }),
		).resolves.toHaveProperty("error");
		await expect(reset(token)).rejects.toThrow();
		expect(users[0].hash).toBe("old-hash");
	});

	it("stop working when the account email changes", async () => {
		const { caller, users, requestLink, reset } = setup();
		const token = await requestLink("victim@example.com");
		users[0].email = "changed@example.com";

		await expect(
			caller.auth.validateResetPasswordToken({ token }),
		).resolves.toHaveProperty("error");
		await expect(reset(token)).rejects.toThrow();
		expect(users[0].hash).toBe("old-hash");
	});

	it("are stored only as a hash", async () => {
		const { rows, requestLink } = setup();
		const token = await requestLink("victim@example.com");

		expect(rows()).toHaveLength(1);
		expect(rows()[0].identifier).not.toContain(token);
		expect(rows()[0].value).not.toContain(token);
	});
});
