/**
 * A user's password hash and two factor secrets must never be sent to a
 * client. These tests pin down two layers: every query whose result leaves the
 * server asks the database to leave those columns out, and a backstop removes
 * them from any response should a query forget.
 */
jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
	mailTemplateMap: {},
}));
jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/var/lib/zerotier-one",
	ping_api: jest.fn(),
	clearCentralCredentialsCache: jest.fn(),
}));
jest.mock("~/utils/organizationNotifications", () => ({
	sendOrganizationAdminNotification: jest.fn(),
}));
jest.mock("~/server/api/services/credentialAccountService", () => ({
	upsertCredentialAccount: jest.fn(),
}));
jest.mock("~/server/api/services/passwordResetService", () => ({
	...jest.requireActual("~/server/api/services/passwordResetService"),
	consumePasswordResetToken: jest.fn(),
	revokePasswordResetTokens: jest.fn(),
}));
// Every prisma.<model>.<method> is a jest.fn that is created on first use
jest.mock("~/server/db", () => {
	const models = new Map<string, Record<string, jest.Mock>>();
	const prisma: unknown = new Proxy(
		{},
		{
			get(_target, model) {
				if (typeof model !== "string" || model === "then") return undefined;
				if (model === "$transaction") {
					return (run: (tx: unknown) => unknown) => run(prisma);
				}
				if (!models.has(model)) {
					models.set(
						model,
						new Proxy({} as Record<string, jest.Mock>, {
							get(methods, method) {
								if (typeof method !== "string" || method === "then") return undefined;
								methods[method] ??= jest.fn();
								return methods[method];
							},
						}),
					);
				}
				return models.get(model);
			},
		},
	);
	return { prisma };
});

import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";
import { consumePasswordResetToken } from "~/server/api/services/passwordResetService";
import {
	ORG_MEMBER_FIELDS,
	USER_SECRET_FIELDS,
	withoutUserSecrets,
} from "~/server/api/userFields";
import {
	ORG_INVITE_TOKEN_SECRET,
	encrypt,
	generateInstanceSecret,
} from "~/utils/encryption";

type MockedPrisma = Record<string, Record<string, jest.Mock>>;
const db = prisma as unknown as MockedPrisma;

const SECRETS = {
	hash: "$2a$10$abcdefghijklmnopqrstuuJ9l5qN8d0e1f2g3h4i5j6k7l8m9n0o1",
	tempPassword: "temporary-password",
	twoFactorSecret: "encrypted-totp-seed",
	twoFactorRecoveryCodes: ["hashed-recovery-code"],
};
const safeUser = (id: string) => ({
	id,
	name: `name of ${id}`,
	email: `${id}@example.test`,
	role: "USER",
	twoFactorEnabled: true,
});
/** A row the way the database holds it, as returned by a query that forgot to omit */
const fullUser = (id: string) => ({ ...safeUser(id), ...SECRETS });

const callerAs = (role: "ADMIN" | "USER" | null, id = "caller") =>
	appRouter.createCaller({
		session: role ? ({ user: { id, role } } as unknown as Session) : null,
		wss: null,
		prisma: prisma as never,
		res: null,
		req: null,
	});

const expectNoSecrets = (response: unknown) => {
	const serialized = JSON.stringify(response);
	for (const [field, value] of Object.entries(SECRETS)) {
		expect(serialized).not.toContain(`"${field}"`);
		expect(serialized).not.toContain(String(Array.isArray(value) ? value[0] : value));
	}
};

let consoleError: jest.SpyInstance;

beforeEach(() => {
	jest.resetAllMocks();
	consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	consoleError.mockRestore();
});

describe("withoutUserSecrets", () => {
	it("removes the secret columns wherever they are nested", () => {
		const response = {
			organization: { users: [fullUser("a"), fullUser("b")] },
			owner: fullUser("c"),
		};

		expect(withoutUserSecrets(response)).toEqual({
			organization: { users: [safeUser("a"), safeUser("b")] },
			owner: safeUser("c"),
		});
	});

	it("never changes the object it was given", () => {
		// the server may still use it, for example a row it is about to compare a password against
		const row = fullUser("a");
		const response = { users: [row] };

		const cleaned = withoutUserSecrets(response);

		expect(cleaned).not.toBe(response);
		expect(row).toEqual(fullUser("a"));
		expect(response.users[0]).toBe(row);
	});

	it("returns a clean response as is", () => {
		const createdAt = new Date();
		const response = { users: [safeUser("a")], createdAt, count: 1, nothing: null };

		expect(withoutUserSecrets(response)).toBe(response);
		expect(withoutUserSecrets("text")).toBe("text");
		expect(withoutUserSecrets(undefined)).toBeUndefined();
	});

	it("keeps values that are not plain data, such as dates", () => {
		const createdAt = new Date();

		const cleaned = withoutUserSecrets({ ...fullUser("a"), createdAt });

		expect(cleaned.createdAt).toBe(createdAt);
		expect(cleaned).not.toHaveProperty("hash");
	});

	it("only matches the secret columns, not names every object inherits", () => {
		const response = { ...fullUser("a"), constructor: "kept", toString: "kept" };

		expect(withoutUserSecrets(response)).toEqual({
			...safeUser("a"),
			constructor: "kept",
			toString: "kept",
		});
	});

	it("copes with a response that references itself", () => {
		const user: Record<string, unknown> = fullUser("a");
		user.self = user;

		const cleaned = withoutUserSecrets([user]) as Record<string, unknown>[];

		expect(cleaned[0].hash).toBeUndefined();
		expect(cleaned[0].self).toBe(cleaned[0]);
	});

	it("covers exactly the secret columns of the user table", () => {
		expect(Object.keys(USER_SECRET_FIELDS).sort()).toEqual(Object.keys(SECRETS).sort());
	});
});

describe("the backstop on every procedure", () => {
	it("removes secrets a query forgot to omit, and says so in the log", async () => {
		db.user.findFirst.mockResolvedValue({ ...fullUser("caller"), options: {} });

		const me = await callerAs("USER").auth.me();

		expectNoSecrets(me);
		expect(me).toMatchObject(safeUser("caller"));
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("auth.me"));
	});

	it("also covers public procedures and nested rows", async () => {
		db.globalOptions.findFirst.mockResolvedValue({
			welcomeMessageTitle: "hi",
			someone: [fullUser("a")],
		});

		const response = await callerAs(null).public.getWelcomeMessage();

		expectNoSecrets(response);
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining("public.getWelcomeMessage"),
		);
	});

	it("stays quiet when there is nothing to remove", async () => {
		db.user.findFirst.mockResolvedValue({ ...safeUser("caller"), options: {} });

		await callerAs("USER").auth.me();

		expect(consoleError).not.toHaveBeenCalled();
	});
});

describe("queries that return the caller's own row", () => {
	it("auth.me", async () => {
		db.user.findFirst.mockResolvedValue({ ...safeUser("caller"), options: {} });

		await callerAs("USER").auth.me();

		expect(db.user.findFirst.mock.calls[0][0].omit).toEqual(USER_SECRET_FIELDS);
	});

	it("auth.updateUserOptions", async () => {
		db.user.update.mockResolvedValue(safeUser("caller"));

		await callerAs("USER").auth.updateUserOptions({ deAuthorizeWarning: true });

		expect(db.user.update.mock.calls[0][0].omit).toEqual(USER_SECRET_FIELDS);
	});

	it("auth.setZtApi", async () => {
		db.user.update.mockResolvedValue({ ...safeUser("caller"), options: {} });

		await callerAs("USER").auth.setZtApi({ ztCentralApiKey: "" });

		expect(db.user.update.mock.calls[0][0].omit).toEqual(USER_SECRET_FIELDS);
	});

	it("auth.changePasswordFromJwt does not hand the new hash to whoever holds the link", async () => {
		(consumePasswordResetToken as jest.Mock).mockResolvedValue({ id: "caller" });
		db.user.update.mockResolvedValue(safeUser("caller"));

		await callerAs(null).auth.changePasswordFromJwt({
			token: "reset-token",
			password: "Str0ng!Passw0rd",
			newPassword: "Str0ng!Passw0rd",
		});

		const update = db.user.update.mock.calls[0][0];
		expect(update.data.hash).toEqual(expect.any(String));
		expect(update.omit).toEqual(USER_SECRET_FIELDS);
	});

	it("org.createOrg", async () => {
		db.organization.create.mockResolvedValue({ id: "org" });
		db.user.findUnique.mockResolvedValue({ ...safeUser("caller"), memberOfOrgs: [] });

		await callerAs("ADMIN").org.createOrg({ orgName: "org", orgDescription: "" });

		expect(db.user.findUnique.mock.calls.at(-1)[0].omit).toEqual(USER_SECRET_FIELDS);
	});
});

describe("queries that return other users", () => {
	it("org.getOrgById gives a member only what members may see of each other", async () => {
		db.userOrganizationRole.findFirst.mockResolvedValue({ role: "READ_ONLY" });
		db.organization.findUnique.mockResolvedValue({
			id: "org",
			users: [safeUser("admin")],
			userRoles: [],
			webhooks: [],
			invitations: [],
			networks: [],
		});
		db.network_members.groupBy.mockResolvedValue([]);
		db.network.findMany.mockResolvedValue([]);

		await callerAs("USER").org.getOrgById({ organizationId: "org" });

		expect(db.organization.findUnique.mock.calls[0][0].include.users).toEqual({
			select: ORG_MEMBER_FIELDS,
		});
	});

	it("org.getAllOrg", async () => {
		db.organization.findMany.mockResolvedValue([]);

		await callerAs("ADMIN").org.getAllOrg();

		expect(db.organization.findMany.mock.calls[0][0].include.users).toEqual({
			select: ORG_MEMBER_FIELDS,
		});
	});

	it("org.addUser", async () => {
		db.userOrganizationRole.findFirst
			.mockResolvedValueOnce({ role: "ADMIN" }) // the caller may add users
			.mockResolvedValueOnce(null); // the new user is not a member yet
		db.organization.update.mockResolvedValue({ id: "org", users: [safeUser("new")] });
		db.user.findUnique.mockResolvedValue({ email: "new@example.test" });

		await callerAs("USER").org.addUser({
			organizationId: "org",
			userId: "new",
			userName: "new",
			organizationRole: "USER",
		});

		expect(db.organization.update.mock.calls[0][0].include.users).toEqual({
			select: ORG_MEMBER_FIELDS,
		});
	});

	it.each([
		[
			"admin.updateUser",
			() => callerAs("ADMIN").admin.updateUser({ id: "u", params: {} }),
		],
		[
			"admin.changeRole",
			() => callerAs("ADMIN").admin.changeRole({ id: "u", role: "USER" }),
		],
		[
			"admin.assignUserGroup, removing the group",
			() => callerAs("ADMIN").admin.assignUserGroup({ userid: "u", userGroupId: "none" }),
		],
		[
			"admin.assignUserGroup, setting a group",
			() => callerAs("ADMIN").admin.assignUserGroup({ userid: "u", userGroupId: "1" }),
		],
	])("%s", async (_name, call) => {
		db.user.findUnique.mockResolvedValue(safeUser("u"));
		db.userGroup.findUnique.mockResolvedValue({ id: 1, name: "group", expiresAt: null });
		db.user.update.mockResolvedValue(safeUser("u"));

		await call();

		expect(db.user.update.mock.calls.at(-1)[0].omit).toEqual(USER_SECRET_FIELDS);
	});
});

describe("org.preValidateUserInvite", () => {
	const inviteFor = (email: string) =>
		encrypt(
			JSON.stringify({
				email,
				organizationId: "org",
				role: "USER",
				invitedById: "org-admin",
				expiresAt: Date.now() + 3600000,
			}),
			generateInstanceSecret(ORG_INVITE_TOKEN_SECRET),
		);

	it("tells the holder of an invitation link nothing about the invited account", async () => {
		const token = inviteFor("invited@example.test");
		db.invitation.findFirst.mockResolvedValue({
			token,
			expiresAt: new Date(Date.now() + 3600000),
		});
		// worst case: the lookup returns the whole row
		db.user.findFirst.mockResolvedValue(fullUser("invited"));
		db.userOrganizationRole.findFirst.mockResolvedValue(null);

		// public procedure, called without a session
		const response = await callerAs(null).org.preValidateUserInvite({ token });

		expect(response).toEqual({ organizationId: "org" });
		expectNoSecrets(response);
		expect(db.user.findFirst.mock.calls[0][0].select).toEqual({ id: true, name: true });
		// the invited user is still added to the organization
		expect(db.organization.update).toHaveBeenCalledTimes(1);
		expect(db.organization.update.mock.calls[0][0].include).toBeUndefined();
	});
});
