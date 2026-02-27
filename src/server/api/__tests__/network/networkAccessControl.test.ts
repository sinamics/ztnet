import { PrismaClient } from "@prisma/client";
import { type Session } from "next-auth";
import { appRouter } from "../../root";
import { type PartialDeep } from "type-fest";

// Mock ztController to prevent actual ZeroTier API calls
jest.mock("~/utils/ztApi", () => ({
	network_update: jest.fn().mockResolvedValue({}),
	network_delete: jest.fn().mockResolvedValue({}),
	network_members: jest.fn().mockResolvedValue({}),
	member_update: jest.fn().mockResolvedValue({}),
	get_network: jest.fn().mockResolvedValue({ v6AssignMode: {} }),
	member_details: jest.fn().mockResolvedValue({}),
	local_network_and_members: jest.fn().mockResolvedValue({ members: [] }),
}));

jest.mock("~/utils/webhook", () => ({
	sendWebhook: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn().mockResolvedValue(undefined),
}));

const prisma = new PrismaClient();

const ownerSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	update: { name: "test" },
	user: {
		id: "owner-user-id",
		name: "Network Owner",
		email: "owner@test.com",
	},
};

const attackerSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	update: { name: "test" },
	user: {
		id: "attacker-user-id",
		name: "Attacker",
		email: "attacker@test.com",
	},
};

const orgMemberSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	update: { name: "test" },
	user: {
		id: "org-member-id",
		name: "Org Member",
		email: "orgmember@test.com",
	},
};

const createCaller = (session: PartialDeep<Session>) =>
	appRouter.createCaller({
		session: session as Session,
		wss: null,
		prisma: prisma,
		res: null,
	});

// Helper to mock a personal network (no organizationId)
const mockPersonalNetwork = (authorId: string) => {
	prisma.network.findUnique = jest.fn().mockResolvedValue({
		authorId,
		organizationId: null,
	});
};

// Helper to mock an organization network
const mockOrgNetwork = (authorId: string, organizationId: string) => {
	prisma.network.findUnique = jest.fn().mockResolvedValue({
		authorId,
		organizationId,
	});
};

/**
 * Helper to mock organization role check.
 * checkNetworkAccess now delegates to checkUserOrganizationRole for org networks,
 * which queries userOrganizationRole.findFirst to verify the user's role.
 */
const mockOrgRole = (role: string | null) => {
	prisma.userOrganizationRole.findFirst = jest
		.fn()
		.mockResolvedValue(role ? { role } : null);
};

// Helper to mock non-existent network
const mockNetworkNotFound = () => {
	prisma.network.findUnique = jest.fn().mockResolvedValue(null);
};

describe("checkNetworkAccess - helper behavior via endpoints", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Network not found", () => {
		it("should reject when network does not exist", async () => {
			mockNetworkNotFound();
			const caller = createCaller(ownerSession);

			await expect(
				caller.network.getFlowRule({ nwid: "nonexistent", central: false }),
			).rejects.toThrow(
				expect.objectContaining({
					code: "NOT_FOUND",
				}),
			);
		});
	});

	describe("Personal network - owner access", () => {
		it("should allow network owner to access getFlowRule", async () => {
			mockPersonalNetwork("owner-user-id");
			prisma.network.findFirst = jest.fn().mockResolvedValue({ flowRule: "accept;" });

			const caller = createCaller(ownerSession);
			const result = await caller.network.getFlowRule({
				nwid: "test-nwid",
				central: false,
			});
			expect(result).toBe("accept;");
		});

		it("should allow network owner to access getAnotation", async () => {
			mockPersonalNetwork("owner-user-id");
			prisma.notation.findMany = jest.fn().mockResolvedValue([]);

			const caller = createCaller(ownerSession);
			const result = await caller.network.getAnotation({
				nwid: "test-nwid",
			});
			expect(result).toEqual([]);
		});
	});

	describe("Personal network - non-owner rejection", () => {
		it("should reject non-owner from getFlowRule", async () => {
			mockPersonalNetwork("owner-user-id");
			const caller = createCaller(attackerSession);

			await expect(
				caller.network.getFlowRule({
					nwid: "test-nwid",
					central: false,
				}),
			).rejects.toThrow("You do not have access to this network!");
		});

		it("should reject non-owner from getAnotation", async () => {
			mockPersonalNetwork("owner-user-id");
			const caller = createCaller(attackerSession);

			await expect(caller.network.getAnotation({ nwid: "test-nwid" })).rejects.toThrow(
				"You do not have access to this network!",
			);
		});

		it("should reject non-owner from networkName mutation", async () => {
			mockPersonalNetwork("owner-user-id");
			const caller = createCaller(attackerSession);

			await expect(
				caller.network.networkName({
					nwid: "test-nwid",
					central: false,
					updateParams: { name: "hacked" },
				}),
			).rejects.toThrow("You do not have access to this network!");
		});

		it("should reject non-owner from deleteNetwork mutation", async () => {
			mockPersonalNetwork("owner-user-id");
			const caller = createCaller(attackerSession);

			await expect(
				caller.network.deleteNetwork({
					nwid: "test-nwid",
					central: false,
				}),
			).rejects.toThrow("You do not have access to this network!");
		});

		it("should reject non-owner from networkDescription mutation", async () => {
			mockPersonalNetwork("owner-user-id");
			const caller = createCaller(attackerSession);

			await expect(
				caller.network.networkDescription({
					nwid: "test-nwid",
					central: false,
					updateParams: { description: "hacked" },
				}),
			).rejects.toThrow("You do not have access to this network!");
		});

		it("should reject non-owner from setFlowRule mutation", async () => {
			mockPersonalNetwork("owner-user-id");
			const caller = createCaller(attackerSession);

			await expect(
				caller.network.setFlowRule({
					nwid: "test-nwid",
					central: false,
					updateParams: { flowRoute: "drop;" },
				}),
			).rejects.toThrow("You do not have access to this network!");
		});
	});

	describe("Organization network - role-based access", () => {
		it("should allow org USER to access org network via getFlowRule (read)", async () => {
			mockOrgNetwork("owner-user-id", "org-1");
			mockOrgRole("USER");
			prisma.network.findFirst = jest.fn().mockResolvedValue({ flowRule: "accept;" });

			const caller = createCaller(orgMemberSession);
			const result = await caller.network.getFlowRule({
				nwid: "test-nwid",
				central: false,
			});
			expect(result).toBe("accept;");
		});

		it("should allow org READ_ONLY to access org network via getFlowRule (read)", async () => {
			mockOrgNetwork("owner-user-id", "org-1");
			mockOrgRole("READ_ONLY");
			prisma.network.findFirst = jest.fn().mockResolvedValue({ flowRule: "accept;" });

			const caller = createCaller(orgMemberSession);
			const result = await caller.network.getFlowRule({
				nwid: "test-nwid",
				central: false,
			});
			expect(result).toBe("accept;");
		});

		it("should reject non-member from org network", async () => {
			mockOrgNetwork("owner-user-id", "org-1");
			mockOrgRole(null); // not a member

			const caller = createCaller(attackerSession);

			await expect(
				caller.network.getFlowRule({
					nwid: "test-nwid",
					central: false,
				}),
			).rejects.toThrow();
		});

		it("should reject org READ_ONLY user from networkName mutation", async () => {
			mockOrgNetwork("owner-user-id", "org-1");
			mockOrgRole("READ_ONLY");

			const caller = createCaller(orgMemberSession);

			await expect(
				caller.network.networkName({
					nwid: "test-nwid",
					central: false,
					updateParams: { name: "new-name" },
				}),
			).rejects.toThrow();
		});

		it("should allow org USER to perform networkName mutation", async () => {
			mockOrgNetwork("owner-user-id", "org-1");
			mockOrgRole("USER");
			prisma.activityLog.create = jest.fn().mockResolvedValue({});
			prisma.network.update = jest.fn().mockResolvedValue({});

			const caller = createCaller(orgMemberSession);
			// Should not throw - USER role meets Role.USER minimum
			await expect(
				caller.network.networkName({
					nwid: "test-nwid",
					central: false,
					updateParams: { name: "new-name" },
				}),
			).resolves.toBeDefined();
		});
	});

	describe("Activity log not created for unauthorized requests", () => {
		it("should not create activity log when non-owner attempts networkName mutation", async () => {
			mockPersonalNetwork("owner-user-id");
			prisma.activityLog.create = jest.fn().mockResolvedValue({});
			const caller = createCaller(attackerSession);

			await expect(
				caller.network.networkName({
					nwid: "test-nwid",
					central: false,
					updateParams: { name: "hacked" },
				}),
			).rejects.toThrow("You do not have access to this network!");

			// The activity log should NOT have been created since auth check runs first
			expect(prisma.activityLog.create).not.toHaveBeenCalled();
		});
	});
});

describe("Member router access control", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should reject non-owner from getMemberById", async () => {
		mockPersonalNetwork("owner-user-id");
		const caller = createCaller(attackerSession);

		await expect(
			caller.networkMember.getMemberById({
				nwid: "test-nwid",
				id: "member-id",
				central: false,
			}),
		).rejects.toThrow("You do not have access to this network!");
	});

	it("should reject non-owner from getMemberAnotations", async () => {
		mockPersonalNetwork("owner-user-id");
		const caller = createCaller(attackerSession);

		await expect(
			caller.networkMember.getMemberAnotations({
				nwid: "test-nwid",
				nodeid: 1,
			}),
		).rejects.toThrow("You do not have access to this network!");
	});

	it("should allow owner to access getMemberById", async () => {
		mockPersonalNetwork("owner-user-id");
		prisma.network_members.findFirst = jest.fn().mockResolvedValue({
			id: "member-id",
			nwid: "test-nwid",
		});

		const caller = createCaller(ownerSession);
		const result = await caller.networkMember.getMemberById({
			nwid: "test-nwid",
			id: "member-id",
			central: false,
		});
		expect(result).toBeDefined();
	});
});

describe("Organization router access control", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should reject non-member from markMessagesAsRead", async () => {
		// Mock the org role check to fail (user not in org)
		prisma.userOrganizationRole.findFirst = jest.fn().mockResolvedValue(null);

		const caller = createCaller(attackerSession);

		await expect(
			caller.org.markMessagesAsRead({
				organizationId: "org-1",
			}),
		).rejects.toThrow();
	});

	it("should allow org member to markMessagesAsRead", async () => {
		// Mock the org role check to succeed
		prisma.userOrganizationRole.findFirst = jest.fn().mockResolvedValue({ role: "USER" });
		prisma.messages.findFirst = jest
			.fn()
			.mockResolvedValue({ id: 1, organizationId: "org-1" });
		prisma.lastReadMessage.upsert = jest.fn().mockResolvedValue({
			userId: "org-member-id",
			organizationId: "org-1",
			lastMessageId: 1,
		});

		const caller = createCaller(orgMemberSession);
		const result = await caller.org.markMessagesAsRead({
			organizationId: "org-1",
		});
		expect(result).toBeDefined();
	});
});
