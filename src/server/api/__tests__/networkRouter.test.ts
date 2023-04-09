import { test, expect } from "@jest/globals";
import { appRouter } from "../root";
import { type Session } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { type PartialDeep } from "type-fest";

test("getUserNetworks API test", async () => {
  const prismaMock = new PrismaClient();

  interface Network {
    nwid: string;
    nwname: string;
    authorId: number;
    network_members: NetworkMember[];
  }

  interface NetworkMember {
    id: string;
  }

  const mockSession: PartialDeep<Session> = {
    expires: new Date().toISOString(),
    update: { name: "test" },
    user: {
      id: 1,
      name: "Bernt Christian",
      email: "mail@gmail.com",
    },
  };

  const mockOutput: Network[] = [
    {
      nwid: "1",
      nwname: "test",
      authorId: 10,
      network_members: [
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

  const result = await caller.network.getUserNetworks();

  expect(result).toHaveLength(mockOutput.length);
  expect(result).toStrictEqual(mockOutput);
});
