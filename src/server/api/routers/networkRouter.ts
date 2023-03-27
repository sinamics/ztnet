/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
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
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
    });
    return networks;
  }),
  memberUpdate: protectedProcedure
    .input(
      z.object({
        nwid: z.string(),
        memberId: z.string(),
        data: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // async (_: any, nw: any) => {
      // if users click the re-generate icon on IP address
      // if (input.nw.data && input.nw.data.generateIp4) {
      //   // Generate ipv4 address, cidr, start & end
      //   //TODO add options in UI for IPv4 selector
      //   const ipAssignmentPools = IP.randomIPv4();
      //   await ztController.network_update(input.nw.nwid, ipAssignmentPools);
      //   // Generate new ipv4 address by passing in empty array '10.24.118.16'
      //   input.nw.data = Object.assign({}, { ipAssignments: [], noAutoAssignIps: false });
      // }

      // remove ip specified by user UI
      // if (input.nw.data && input.nw.data.hasOwnProperty('removeIp4index')) {
      //   const { ipAssignments, removeIp4index } = input.nw.data;
      //   // slice out ip
      //   ipAssignments.splice(removeIp4index, 1);

      //   // update controller
      //   return await ztController.member_update(input.nw.nwid, input.nw.memberId, { ipAssignments }).catch((err: any) => console.log(err));
      // }

      const updatedMember = await ztController
        .member_update(input.nwid, input.memberId, input.data)
        .catch(() => {
          throw new TRPCError({
            message:
              "Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network",
            code: "FORBIDDEN",
          });
        });

      const response = await ctx.prisma.network
        .update({
          where: {
            nwid: input.nwid,
          },
          data: {
            network_members: {
              updateMany: {
                where: { id: input.memberId, nwid: input.nwid },
                data: {
                  ipAssignments: updatedMember.ipAssignments,
                  authorized: updatedMember.authorized,
                },
              },
            },
          },
          include: {
            network_members: {
              where: {
                id: input.memberId,
                nwid: input.nwid,
              },
            },
          },
        })
        .catch((err: any) => console.log(err));
      if (!response) {
        throw new TRPCError({
          message: "Network database response is empty.",
          code: "BAD_REQUEST",
        });
      }

      if ("network_members" in response) {
        return { member: response.network_members[0] };
      } else {
        throw new TRPCError({
          message: "Response does not have network members.",
          code: "BAD_REQUEST",
        });
      }
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
      // if users click the re-generate icon on IP address
      const response = await ctx.prisma.network.update({
        where: {
          nwid: input.nwid,
        },
        data: {
          network_members: {
            update: {
              where: { nodeid: input.nodeid },
              data: {
                name: input.newName,
              },
            },
          },
        },
        include: {
          network_members: {
            where: {
              nodeid: input.nodeid,
            },
          },
        },
      });
      return { member: response.network_members[0] };
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

      // Get peers to view client version of zt
      for (const member of getActiveMembers) {
        // member.creationTime = new Date(member.creationTime * 1000);

        const peers = await ztController.peer(member.address);
        const memberPeer = peers.find((peer) => peer.address === member.id);

        try {
          Object.assign(member, {
            peers: memberPeer,
          });
        } catch (error) {}
      }

      // const latencyInfo: { [memberId: string]: number } = {};
      // for (const member of getActiveMembers) {
      //   if (member.id === "4ef7287f63") {
      //     //@ts-ignore
      //     const filteredPeers = member.peers.filter(
      //       (peer) => peer.latency >= 0
      //     );
      //     //@ts-ignore
      //     const totalLatency = filteredPeers.reduce(
      //       (sum, peer) => sum + peer.latency,
      //       0
      //     );
      //     //@ts-ignore
      //     const averageLatency = totalLatency / filteredPeers.length;
      //     latencyInfo[member.id] = averageLatency;
      //     // console.log(latencyInfo);
      //   }
      // }

      // console.log(ztControllerResponse);
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
