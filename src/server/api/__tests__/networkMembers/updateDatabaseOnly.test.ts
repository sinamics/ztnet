/* eslint-disable @typescript-eslint/no-unused-vars */

import { test, expect } from "@jest/globals";
import { type PrismaClient } from "@prisma/client";
import { type AppRouter, appRouter } from "../../root";
import { type PartialDeep } from "type-fest";
import type { Session } from "~/lib/authTypes";
import { type inferProcedureInput } from "@trpc/server";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { type MemberEntity } from "~/types/local/member";

type TestTypes = {
	id: string;
	name: string;
	nwid: string;
	networkMembers: MemberEntity[];
};

const setup = () => {
	// const prismaMock = new PrismaClient();
	const mock = mockDeep<PrismaClient>();
	const prisma: DeepMockProxy<PrismaClient> =
		mock as unknown as DeepMockProxy<PrismaClient>;

	const mockSession: PartialDeep<Session> = {
		expires: new Date().toISOString(),
		user: {
			id: "userid",
		},
	};

	const mockOutput: PartialDeep<TestTypes> = {
		id: "member-id",
		name: "updated name",
		nwid: "nwid-123",
		networkMembers: [],
	};

	type Input = inferProcedureInput<AppRouter["networkMember"]["UpdateDatabaseOnly"]>;
	const input: Input = {
		nwid: "1234id",
		id: "12234",
		updateParams: {
			deleted: false,
		},
	};

	const caller = appRouter.createCaller({
		session: mockSession as Session,
		prisma: prisma,
		wss: null,
		res: null,
		req: null,
	});

	// Mock network access check - return network owned by the test user
	prisma.network.findUnique.mockResolvedValue({
		authorId: "userid",
		organizationId: null,
	} as never);

	// Mock activity log creation
	prisma.activityLog.create.mockResolvedValue({} as never);

	// @ts-expect-error -- awaiting fix:
	prisma.network.update.mockResolvedValue(mockOutput);

	return { prisma, caller, input, mockOutput };
};

const expectedUpdate = (input: { nwid: string; id: string }, data: object) => ({
	where: {
		nwid: input.nwid,
	},
	data: {
		networkMembers: {
			update: {
				where: {
					id_nwid: {
						id: input.id,
						nwid: input.nwid,
					},
				},
				data,
			},
		},
	},
	include: {
		networkMembers: {
			where: {
				id: input.id,
			},
		},
	},
});

test("updateDatabaseOnly restore clears both deleted flags", async () => {
	const { prisma, caller, input, mockOutput } = setup();

	const result = await caller.networkMember.UpdateDatabaseOnly(input);

	// eslint-disable-next-line @typescript-eslint/unbound-method
	expect(prisma.network.update).toHaveBeenCalledWith(
		expectedUpdate(input, { deleted: false, permanentlyDeleted: false }),
	);
	expect(result).toEqual({ member: mockOutput.networkMembers[0] });
});

test("updateDatabaseOnly ignores permanentlyDeleted from the client", async () => {
	const { prisma, caller, input } = setup();

	await caller.networkMember.UpdateDatabaseOnly({
		...input,
		updateParams: {
			deleted: true,
			permanentlyDeleted: true,
		} as typeof input.updateParams,
	});

	// eslint-disable-next-line @typescript-eslint/unbound-method
	expect(prisma.network.update).toHaveBeenCalledWith(
		expectedUpdate(input, { deleted: true }),
	);
});
