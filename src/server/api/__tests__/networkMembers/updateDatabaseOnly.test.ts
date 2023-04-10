/* eslint-disable @typescript-eslint/no-unused-vars */

import { test, expect } from "@jest/globals";
import { type PrismaClient } from "@prisma/client";
import { type AppRouter, appRouter } from "../../root";
import { type PartialDeep } from "type-fest";
import { type Session } from "next-auth";
import { type ZtControllerNetwork } from "~/types/network";
import { type inferProcedureInput } from "@trpc/server";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";

test("updateDatabaseOnly test", async () => {
  // const prismaMock = new PrismaClient();
  const mock = mockDeep<PrismaClient>();
  const prisma: DeepMockProxy<PrismaClient> =
    mock as unknown as DeepMockProxy<PrismaClient>;

  const mockSession: PartialDeep<Session> = {
    expires: new Date().toISOString(),
    user: {
      id: 1,
    },
  };

  const mockOutput: PartialDeep<ZtControllerNetwork> = {
    id: "member-id",
    name: "updated name",
    nwid: "nwid-123",
    network_members: [],
  };

  type Input = inferProcedureInput<
    AppRouter["networkMember"]["UpdateDatabaseOnly"]
  >;
  const input: Input = {
    nwid: "1234id",
    id: "12234",
    updateParams: {
      deleted: false,
      name: "test name",
    },
  };

  const caller = appRouter.createCaller({
    session: mockSession as Session,
    prisma: prisma,
  });
  // @ts-expect-error -- awaiting fix:
  prisma.network.update.mockResolvedValue(mockOutput);

  const result = await caller.networkMember.UpdateDatabaseOnly(input);

  // eslint-disable-next-line @typescript-eslint/unbound-method
  expect(prisma.network.update).toBeCalledWith({
    where: {
      nwid: input.nwid,
    },
    data: {
      network_members: {
        update: {
          where: { id: input.id },
          data: {
            ...input.updateParams,
          },
        },
      },
    },
    include: {
      network_members: {
        where: {
          id: input.id,
        },
      },
    },
  });

  expect(result).toEqual({ member: mockOutput.network_members[0] });
});
