import { describe, test, expect, beforeEach } from "@jest/globals";
import { type PrismaClient } from "@prisma/client";
import { appRouter } from "../../root";
import type { Session } from "~/lib/authTypes";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";

const NWID = "1234567890abcdef";
const MEMBER = "aabbccddee";

describe("member notes", () => {
	let prisma: DeepMockProxy<PrismaClient>;

	const makeCaller = () =>
		appRouter.createCaller({
			session: { expires: new Date().toISOString(), user: { id: "userid" } } as Session,
			prisma,
			wss: null,
			res: null,
			req: null,
		});

	beforeEach(() => {
		prisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;
		prisma.activityLog.create.mockResolvedValue({} as never);
	});

	test("owner of a personal network can save notes; text is not logged", async () => {
		prisma.network.findUnique.mockResolvedValue({
			authorId: "userid",
			organizationId: null,
		} as never);
		prisma.network_members.findUnique.mockResolvedValue({
			nodeid: 7,
			nwid_ref: { organizationId: null },
		} as never);
		prisma.networkMemberNote.upsert.mockResolvedValue({} as never);

		const result = await makeCaller().networkMember.updateMemberNotes({
			nwid: NWID,
			memberId: MEMBER,
			notes: "  router admin on site B  ",
		});

		expect(result).toEqual({ hasNotes: true });
		expect(prisma.networkMemberNote.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { nodeid: 7 },
				create: expect.objectContaining({ notes: "router admin on site B" }),
			}),
		);
		const logged = JSON.stringify(prisma.activityLog.create.mock.calls);
		expect(logged).toContain(MEMBER);
		expect(logged).not.toContain("router admin");
	});

	test("blank notes delete the row", async () => {
		prisma.network.findUnique.mockResolvedValue({
			authorId: "userid",
			organizationId: null,
		} as never);
		prisma.network_members.findUnique.mockResolvedValue({
			nodeid: 7,
			nwid_ref: { organizationId: null },
		} as never);
		prisma.networkMemberNote.deleteMany.mockResolvedValue({ count: 1 } as never);

		const result = await makeCaller().networkMember.updateMemberNotes({
			nwid: NWID,
			memberId: MEMBER,
			notes: "   ",
		});

		expect(result).toEqual({ hasNotes: false });
		expect(prisma.networkMemberNote.upsert).not.toHaveBeenCalled();
		expect(prisma.networkMemberNote.deleteMany).toHaveBeenCalled();
	});

	test("a user who does not own the network cannot save notes", async () => {
		prisma.network.findUnique.mockResolvedValue({
			authorId: "someone-else",
			organizationId: null,
		} as never);

		await expect(
			makeCaller().networkMember.updateMemberNotes({
				nwid: NWID,
				memberId: MEMBER,
				notes: "x",
			}),
		).rejects.toThrow();
		expect(prisma.networkMemberNote.upsert).not.toHaveBeenCalled();
	});

	test("notes longer than the limit are rejected", async () => {
		await expect(
			makeCaller().networkMember.updateMemberNotes({
				nwid: NWID,
				memberId: MEMBER,
				notes: "x".repeat(10001),
			}),
		).rejects.toThrow();
	});

	const asOrgRole = (role: "READ_ONLY" | "USER" | "MODERATOR" | "ADMIN") => {
		prisma.network.findUnique.mockResolvedValue({
			authorId: "someone-else",
			organizationId: "org1",
		} as never);
		prisma.userOrganizationRole.findFirst.mockResolvedValue({ role } as never);
	};

	test("getNotedMemberIds returns only member ids, never note text", async () => {
		prisma.network.findUnique.mockResolvedValue({
			authorId: "userid",
			organizationId: null,
		} as never);
		prisma.networkMemberNote.findMany.mockResolvedValue([
			{ member: { id: MEMBER } },
		] as never);

		const result = await makeCaller().networkMember.getNotedMemberIds({ nwid: NWID });
		expect(result).toEqual({ memberIds: [MEMBER], canView: true });
	});

	test("READ_ONLY users get no note ids and cannot read notes", async () => {
		asOrgRole("READ_ONLY");

		const result = await makeCaller().networkMember.getNotedMemberIds({ nwid: NWID });
		expect(result).toEqual({ memberIds: [], canView: false });
		expect(prisma.networkMemberNote.findMany).not.toHaveBeenCalled();

		await expect(
			makeCaller().networkMember.getMemberNotes({ nwid: NWID, memberId: MEMBER }),
		).rejects.toThrow();
		expect(prisma.networkMemberNote.findFirst).not.toHaveBeenCalled();
	});

	test("USER can read notes but not edit them", async () => {
		asOrgRole("USER");
		prisma.networkMemberNote.findFirst.mockResolvedValue({
			notes: "rack 3",
			updatedAt: new Date(0),
		} as never);

		const result = await makeCaller().networkMember.getMemberNotes({
			nwid: NWID,
			memberId: MEMBER,
		});
		expect(result).toMatchObject({ notes: "rack 3", canEdit: false });

		await expect(
			makeCaller().networkMember.updateMemberNotes({
				nwid: NWID,
				memberId: MEMBER,
				notes: "x",
			}),
		).rejects.toThrow();
		expect(prisma.networkMemberNote.upsert).not.toHaveBeenCalled();
	});

	test("ADMIN can read and edit notes", async () => {
		asOrgRole("ADMIN");
		prisma.networkMemberNote.findFirst.mockResolvedValue(null as never);

		const result = await makeCaller().networkMember.getMemberNotes({
			nwid: NWID,
			memberId: MEMBER,
		});
		expect(result).toMatchObject({ notes: "", canEdit: true });
	});
});
