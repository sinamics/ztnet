/**
 * Registering through an organization invitation consumes the invitation in
 * the same transaction that creates the account. An invitation that was used
 * or revoked in the meantime must not create anything.
 */
import { test, expect, describe } from "@jest/globals";

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
jest.mock("~/server/api/services/organizationAuthService", () => ({
	validateOrganizationToken: jest.fn().mockResolvedValue({
		organizationId: "org",
		invitation: {
			id: 7,
			role: "USER",
			email: "new@example.com",
			invitedById: "org-admin",
		},
	}),
}));

import { appRouter } from "../../root";
import { PrismaClient } from "@prisma/client";

const makePrisma = (consumed: number) => {
	const prisma = new PrismaClient();
	prisma.user.findFirst = jest.fn().mockResolvedValue(null) as never;
	prisma.user.count = jest.fn().mockResolvedValue(1) as never;
	prisma.user.create = jest.fn().mockResolvedValue({
		id: "user_new",
		name: "New",
		email: "new@example.com",
		expiresAt: null,
		role: "USER",
		memberOfOrgs: [{ id: "org", orgName: "Org" }],
	}) as never;
	prisma.userGroup.findFirst = jest.fn().mockResolvedValue(null) as never;
	prisma.globalOptions.findFirst = jest.fn().mockResolvedValue({
		enableRegistration: true,
		userRegistrationNotification: false,
	}) as never;
	prisma.invitation.deleteMany = jest
		.fn()
		.mockResolvedValueOnce({ count: consumed })
		.mockResolvedValue({ count: 0 }) as never;
	prisma.invitation.delete = jest.fn() as never;
	prisma.activityLog.create = jest.fn().mockResolvedValue({}) as never;
	prisma.$transaction = jest.fn((run: (tx: PrismaClient) => unknown) =>
		run(prisma),
	) as never;
	return prisma;
};

const register = (prisma: PrismaClient) =>
	appRouter
		.createCaller({
			session: null,
			wss: null,
			prisma,
			res: { setHeader: jest.fn() } as never,
			req: { headers: {} } as never,
		})
		.auth.register({
			email: "new@example.com",
			password: "BrandNew123!",
			name: "New",
			ztnetOrganizationToken: "token",
		});

describe("auth.register with an organization invitation", () => {
	test("consumes the invitation before creating the account", async () => {
		const prisma = makePrisma(1);

		await register(prisma);

		const deleteMany = prisma.invitation.deleteMany as jest.Mock;
		expect(deleteMany.mock.calls[0][0]).toEqual({ where: { id: 7 } });
		// other pending invitations of the same user to the organization
		expect(deleteMany.mock.calls[1][0]).toEqual({
			where: {
				email: { equals: "new@example.com", mode: "insensitive" },
				organizations: { some: { organizationId: "org" } },
			},
		});
		expect(deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
			(prisma.user.create as jest.Mock).mock.invocationCallOrder[0],
		);
		expect(prisma.user.create).toHaveBeenCalledTimes(1);
	});

	test("creates nothing when the invitation is gone", async () => {
		const prisma = makePrisma(0);

		await expect(register(prisma)).rejects.toThrow("Invalid token data!");

		expect(prisma.user.create).not.toHaveBeenCalled();
		expect(prisma.activityLog.create).not.toHaveBeenCalled();
	});
});
