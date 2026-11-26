import type { PrismaClient } from "@prisma/client";
import type { Session } from "~/lib/authTypes";
import { appRouter } from "../../root";
import { emitOrganizationMessage } from "~/server/sync/organizationChat";
import { userRoom } from "~/utils/socketChannels";

const membersOf = (...userIds: string[]) =>
	({
		userOrganizationRole: {
			findMany: jest.fn().mockResolvedValue(userIds.map((userId) => ({ userId }))),
		},
	}) as unknown as PrismaClient;

const socketServer = () => {
	const roomEmit = jest.fn();
	return { emit: jest.fn(), to: jest.fn().mockReturnValue({ emit: roomEmit }), roomEmit };
};

describe("organization chat delivery", () => {
	it("emits to the sockets of the current members only", async () => {
		const io = socketServer();
		const db = membersOf("user-1", "user-2");

		await emitOrganizationMessage(io as never, db, "org-a", { id: 1 });

		expect(db.userOrganizationRole.findMany).toHaveBeenCalledWith({
			where: { organizationId: "org-a" },
			select: { userId: true },
		});
		expect(io.to).toHaveBeenCalledWith([userRoom("user-1"), userRoom("user-2")]);
		expect(io.roomEmit).toHaveBeenCalledWith("org-a", { id: 1 });
		expect(io.emit).not.toHaveBeenCalled();
	});

	it("emits nothing when the organization has no members", async () => {
		const io = socketServer();

		await emitOrganizationMessage(io as never, membersOf(), "org-a", { id: 1 });

		expect(io.to).not.toHaveBeenCalled();
		expect(io.emit).not.toHaveBeenCalled();
	});

	it("does nothing without a socket server", async () => {
		const db = membersOf("user-1");
		await expect(
			emitOrganizationMessage(null, db, "org-a", { id: 1 }),
		).resolves.toBeUndefined();
		expect(db.userOrganizationRole.findMany).not.toHaveBeenCalled();
	});

	it("sendMessage addresses the members, not every socket", async () => {
		const message = { id: 1, content: "hello", organizationId: "org-a" };
		const io = socketServer();
		const prisma = {
			userOrganizationRole: {
				findFirst: jest.fn().mockResolvedValue({ role: "USER" }),
				findMany: jest.fn().mockResolvedValue([{ userId: "user-1" }]),
			},
			messages: { create: jest.fn().mockResolvedValue(message) },
			lastReadMessage: { upsert: jest.fn().mockResolvedValue({}) },
		};

		const caller = appRouter.createCaller({
			session: { user: { id: "user-1" } } as unknown as Session,
			wss: io as never,
			prisma: prisma as never,
			res: null,
			req: null,
		});
		const result = await caller.org.sendMessage({
			organizationId: "org-a",
			message: "hello",
		});

		expect(result).toEqual(message);
		expect(io.to).toHaveBeenCalledWith([userRoom("user-1")]);
		expect(io.roomEmit).toHaveBeenCalledWith("org-a", message);
		expect(io.emit).not.toHaveBeenCalled();
	});
});
