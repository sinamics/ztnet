import type { PrismaClient } from "@prisma/client";
import type { Session } from "~/lib/authTypes";
import { appRouter } from "../../root";
import {
	joinOrganizationRooms,
	leaveOrganizationRoom,
} from "~/server/sync/organizationRooms";
import { organizationRoom, userRoom } from "~/utils/socketChannels";

describe("organization chat rooms", () => {
	it("joins a socket to its user room and to its organizations only", async () => {
		const join = jest.fn();
		const findMany = jest
			.fn()
			.mockResolvedValue([{ organizationId: "org-a" }, { organizationId: "org-b" }]);

		await joinOrganizationRooms({ join }, "user-1", {
			userOrganizationRole: { findMany },
		} as unknown as PrismaClient);

		expect(findMany).toHaveBeenCalledWith({
			where: { userId: "user-1" },
			select: { organizationId: true },
		});
		expect(join.mock.calls.map(([room]) => room)).toEqual([
			userRoom("user-1"),
			organizationRoom("org-a"),
			organizationRoom("org-b"),
		]);
	});

	it("takes a removed user out of the organization room", () => {
		const socketsLeave = jest.fn();
		const io = { in: jest.fn().mockReturnValue({ socketsLeave }) };

		leaveOrganizationRoom(io as never, "user-1", "org-a");

		expect(io.in).toHaveBeenCalledWith(userRoom("user-1"));
		expect(socketsLeave).toHaveBeenCalledWith(organizationRoom("org-a"));
	});

	it("emits a new message to the organization room, not to every socket", async () => {
		const message = { id: 1, content: "hello", organizationId: "org-a" };
		const roomEmit = jest.fn();
		const wss = { emit: jest.fn(), to: jest.fn().mockReturnValue({ emit: roomEmit }) };
		const prisma = {
			userOrganizationRole: { findFirst: jest.fn().mockResolvedValue({ role: "USER" }) },
			messages: { create: jest.fn().mockResolvedValue(message) },
			lastReadMessage: { upsert: jest.fn().mockResolvedValue({}) },
		};

		const caller = appRouter.createCaller({
			session: { user: { id: "user-1" } } as unknown as Session,
			wss: wss as never,
			prisma: prisma as never,
			res: null,
			req: null,
		});
		await caller.org.sendMessage({ organizationId: "org-a", message: "hello" });

		expect(wss.to).toHaveBeenCalledWith(organizationRoom("org-a"));
		expect(roomEmit).toHaveBeenCalledWith("org-a", message);
		expect(wss.emit).not.toHaveBeenCalled();
	});
});
