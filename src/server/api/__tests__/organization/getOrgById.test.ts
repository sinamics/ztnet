import { describe, it, expect, beforeEach } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { type PartialDeep } from "type-fest";
import type { Session } from "~/lib/authTypes";
import * as ztController from "~/utils/ztApi";
import { appRouter } from "../../root";

// Mock the ZeroTier controller. The member count is now computed from the
// database, so member_details should only be hit by the background
// reconciliation, never by the counting path.
jest.mock("~/utils/ztApi", () => ({
	member_details: jest.fn(),
}));

const mockSession: PartialDeep<Session> = {
	expires: new Date().toISOString(),
	update: { name: "test" },
	user: {
		id: "userid",
		name: "Bernt Christian",
		email: "mail@gmail.com",
	},
};

// Flush pending microtasks/macrotasks so the fire-and-forget background
// reconciliation has a chance to run before we assert on its side effects.
const flushPromises = async (times = 20): Promise<void> => {
	for (let i = 0; i < times; i++) {
		await new Promise((resolve) => setImmediate(resolve));
	}
};

// Build a Prisma mock that satisfies both the role check and the org lookup.
// biome-ignore lint/suspicious/noExplicitAny: building a minimal Prisma stub
const createPrismaMock = (organization: any): PrismaClient => {
	const prismaMock = new PrismaClient();
	prismaMock.userOrganizationRole.findFirst = jest
		.fn()
		.mockResolvedValue({ role: "ADMIN" });
	prismaMock.organization.findUnique = jest.fn().mockResolvedValue(organization);
	prismaMock.network_members.delete = jest.fn().mockResolvedValue({});
	return prismaMock;
};

const createCaller = (prismaMock: PrismaClient) =>
	appRouter.createCaller({
		session: mockSession as Session,
		wss: null,
		prisma: prismaMock,
		res: null,
	});

describe("organization getOrgById member counts", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("counts authorized and total members from the database, ignoring deleted members", async () => {
		const organizationId = "org-counts";
		const organization = {
			id: organizationId,
			orgName: "Test Org",
			ownerId: "userid",
			userRoles: [],
			users: [],
			webhooks: [],
			invitations: [],
			networks: [
				{
					nwid: "nw1",
					name: "network-one",
					networkMembers: [
						{ id: "m1", nwid: "nw1", authorized: true, deleted: false, permanentlyDeleted: false },
						{ id: "m2", nwid: "nw1", authorized: false, deleted: false, permanentlyDeleted: false },
						// Deleted and permanently deleted members must be excluded from the counts.
						{ id: "m3", nwid: "nw1", authorized: true, deleted: true, permanentlyDeleted: false },
						{ id: "m4", nwid: "nw1", authorized: true, deleted: false, permanentlyDeleted: true },
					],
				},
				{
					nwid: "nw2",
					name: "network-two",
					networkMembers: [
						{ id: "m5", nwid: "nw2", authorized: true, deleted: false, permanentlyDeleted: false },
					],
				},
			],
		};

		// The controller reports everyone as unauthorized. If counting used the
		// controller, the authorized counts would be 0 - asserting they reflect the
		// database `authorized` flag proves the count comes from the database.
		(ztController.member_details as jest.Mock).mockResolvedValue({
			authorized: false,
		});

		const prismaMock = createPrismaMock(organization);
		const result = await createCaller(prismaMock).org.getOrgById({ organizationId });

		expect(result.networks[0].memberCounts).toEqual({
			authorized: 1,
			total: 2,
			display: "1 (2)",
		});
		expect(result.networks[1].memberCounts).toEqual({
			authorized: 1,
			total: 1,
			display: "1 (1)",
		});
		expect(result.memberCounts).toEqual({
			authorized: 2,
			total: 3,
			display: "2 (3)",
		});

		await flushPromises();
	});

	it("returns counts without blocking on the controller", async () => {
		const organizationId = "org-nonblocking";
		const organization = {
			id: organizationId,
			orgName: "Test Org",
			ownerId: "userid",
			userRoles: [],
			users: [],
			webhooks: [],
			invitations: [],
			networks: [
				{
					nwid: "nw1",
					name: "network-one",
					networkMembers: [
						{ id: "m1", nwid: "nw1", authorized: true, deleted: false, permanentlyDeleted: false },
						{ id: "m2", nwid: "nw1", authorized: true, deleted: false, permanentlyDeleted: false },
					],
				},
			],
		};

		// A controller call that never resolves would hang the request if the
		// counting path awaited it. The query must still resolve from the database.
		(ztController.member_details as jest.Mock).mockImplementation(
			() => new Promise(() => {}),
		);

		const prismaMock = createPrismaMock(organization);
		const result = await createCaller(prismaMock).org.getOrgById({ organizationId });

		expect(result.memberCounts.display).toBe("2 (2)");
	});

	it("removes orphaned members in the background when the controller returns 404", async () => {
		const organizationId = "org-reconcile";
		const organization = {
			id: organizationId,
			orgName: "Test Org",
			ownerId: "userid",
			userRoles: [],
			users: [],
			webhooks: [],
			invitations: [],
			networks: [
				{
					nwid: "nw1",
					name: "network-one",
					networkMembers: [
						{ id: "m1", nwid: "nw1", authorized: true, deleted: false, permanentlyDeleted: false },
					],
				},
			],
		};

		// The controller no longer knows about this member - it is an orphan.
		const notFound = new Error("Member not found");
		// biome-ignore lint/suspicious/noExplicitAny: APIError exposes a status field
		(notFound as any).status = 404;
		(ztController.member_details as jest.Mock).mockRejectedValue(notFound);

		const prismaMock = createPrismaMock(organization);
		const result = await createCaller(prismaMock).org.getOrgById({ organizationId });

		// Counts still come back immediately from the database.
		expect(result.networks[0].memberCounts.display).toBe("1 (1)");

		// The background reconciliation deletes the orphaned member row.
		await flushPromises();
		expect(prismaMock.network_members.delete).toHaveBeenCalledWith({
			where: { id_nwid: { id: "m1", nwid: "nw1" } },
		});
	});
});
