import { test, expect } from "@jest/globals";
import { appRouter } from "../../root";
import { type Session } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { type PartialDeep } from "type-fest";

const mockSession: PartialDeep<Session> = {
  expires: new Date().toISOString(),
  update: { name: "test" },
  user: {
    id: 1,
    name: "Bernt Christian",
    email: "mail@gmail.com",
  },
};

test("getUserNetworks", async () => {
  const prismaMock = new PrismaClient();

  interface Network {
    nwid: string;
    name: string;
    authorId: number;
    networkMembers: NetworkMember[];
  }

  interface NetworkMember {
    id: string;
  }

  const mockOutput: Network[] = [
    {
      nwid: "1",
      name: "test",
      authorId: 10,
      networkMembers: [
        {
          id: "4ef7287f63",
        },
        {
          id: "efcc1b0947",
        },
      ],
    },
  ];

  prismaMock.network.findMany = jest.fn().mockResolvedValue(mockOutput);

  //   const caller = appRouter.createCaller({
  //     session: mockSession,
  //     prisma: prisma,
  //   });

  const caller = appRouter.createCaller({
    session: mockSession as Session,
    prisma: prismaMock,
  });

  const result = await caller.network.getUserNetworks({
    central: false,
  });

  expect(result).toHaveLength(mockOutput.length);
  expect(result).toStrictEqual(mockOutput);
});
