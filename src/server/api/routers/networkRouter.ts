/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { randomIPv4 } from "~/utils/ipGenerator";
import Sentencer from "sentencer";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import bluebird from "bluebird";
import { type network, type network_members } from "@prisma/client";
import { updateNetworkMembers } from "../networkService";

interface NetworksTableProps {
  network: network;
  members: network_members[];
  zombieMembers: network_members[];
  updateNetworkHandler: (updateData: any) => void;
  setEditing: (editing: boolean) => void;
  addMember: (nwid: string) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const networkRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    console.log(typeof ctx.session.user.id);
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
    });
    console.log(networks);
    // return {
    //   network: ,
    // };
    return networks;
  }),
  memberUpdateDatabaseOnly: protectedProcedure
    .input(
      z.object({
        nwid: z.string(),
        nodeid: z.number(),
        newName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log(input);
      // if users click the re-generate icon on IP address
      const returnNewMember = await ctx.prisma.network.update({
        where: {
          nwid: input.nwid,
        },
        data: {
          network_members: {
            update: {
              where: { nodeid: parseInt(input.nodeid) },
              data: {
                name: input.newName,
              },
            },
          },
        },
        include: {
          network_members: {
            where: {
              nodeid: parseInt(input.nodeid),
            },
          },
        },
      });
      return { member: returnNewMember.network_members[0] };
    }),
  getNetworkById: protectedProcedure
    .input(z.object({ nwid: z.string() }))
    .query(async ({ ctx, input }) => {
      const NetworkById = await ctx.prisma.network.findFirst({
        where: {
          AND: [
            {
              authorId: { equals: ctx.session.user.id },
              nwid: { equals: input.nwid },
            },
          ],
        },
        include: {
          network_members: true,
        },
      });

      // Only return nw details for author user!
      if (!NetworkById)
        throw new TRPCError({
          message: "You are not the Author of this network!",
          code: "FORBIDDEN",
        });

      // Return nw obj details
      const ztControllerResponse = await ztController
        .network_detail(NetworkById.nwid)
        .catch((err: string) => {
          throw new TRPCError({
            message: err,
            code: "BAD_REQUEST",
          });
        });
      // upate db with new memebers if they not exsist
      await updateNetworkMembers(ztControllerResponse);

      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = randomIPv4(null);

      // Merge data from network DB and zt_controller.network
      const { network: ctrl_network, ...rest } = ztControllerResponse;
      const { cidrOptions } = ipAssignmentPools;

      const combined = {
        ...rest,
        network: {
          ...ctrl_network,
          ...NetworkById,
          cidr: cidrOptions,
        },
      };
      const { members, network } = combined;

      // Get all members that is deleted but still active in controller (zombies).
      // Due to an issue were not possible to delete user.
      // Updated 08/2022, delete function should work if user is de-autorized prior to deleting.
      const getZombieMembers = await bluebird.map(
        members,
        async (member: any) => {
          return await ctx.prisma.network_members.findFirst({
            where: {
              nwid: input.nwid,
              id: member.id,
              deleted: true,
            },
          });
        }
      );

      const getActiveMembers = await ctx.prisma.network_members.findMany({
        where: {
          nwid: input.nwid,
          deleted: false,
        },
      });
      console.log(members);
      // Get peers to view client version of zt
      for (const member of getActiveMembers) {
        // member.creationTime = new Date(member.creationTime * 1000);
        try {
          Object.assign(member, {
            peers: await ztController.peer(member.address),
          });
        } catch (error) {}
      }

      return Promise.all([getActiveMembers, getZombieMembers]).then((res) => {
        // if no zombie members, remove the [null] from array caused by the map function.
        const zombieMembers = res[1].filter((a: any) => a);
        // Return obj
        return { network, members: res[0], zombieMembers };
      });
    }),
  createNetwork: protectedProcedure.mutation(async ({ ctx }) => {
    // Generate ipv4 address, cidr, start & end
    const ipAssignmentPools = randomIPv4(null);

    // Generate adjective and noun word
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const networkName: string = Sentencer.make(
      "{{ adjective }}_{{ noun }}"
    ) as string;

    // Create ZT network
    return ztController
      .network_create(networkName, ipAssignmentPools)
      .then(async (newNw: { name: string; nwid: string }) => {
        // store the created User in db
        return ctx.prisma.user
          .update({
            where: {
              id: ctx.session.user.id,
            },
            data: {
              network: {
                create: {
                  nwname: newNw.name,
                  nwid: newNw.nwid,
                },
              },
            },
            select: {
              network: true,
            },
          })
          .catch((err: any) => {
            console.log(err);
            // throw new ApolloError("Could not create network! Please try again");
          });
      });
  }),
});
