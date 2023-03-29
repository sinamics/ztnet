/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import Sentencer from "sentencer";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import bluebird from "bluebird";
import { updateNetworkMembers } from "../networkService";
import { type network_members } from "@prisma/client";
import { MembersEntity, type NetworkAndMembers } from "~/types/network";

export const networkRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
    });
    return networks;
  }),

  getNetworkById: protectedProcedure
    .input(z.object({ nwid: z.string() }))
    .query(async ({ ctx, input }) => {
      const psqlNetworkData = await ctx.prisma.network.findFirst({
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
      if (!psqlNetworkData)
        throw new TRPCError({
          message: "You are not the Author of this network!",
          code: "FORBIDDEN",
        });

      // Return nw obj details
      const ztControllerResponse = await ztController
        .network_detail(psqlNetworkData.nwid)
        .catch((err: string) => {
          throw new TRPCError({
            message: err,
            code: "BAD_REQUEST",
          });
        });
      // console.log(JSON.stringify(ztControllerResponse, null, 2));
      // upate db with new memebers if they not exsist
      await updateNetworkMembers(ztControllerResponse);

      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = IPv4gen(null);

      // Merge data from network DB and zt_controller.network
      const { network: controllerNetworkData, ...rest } = ztControllerResponse;
      const { cidrOptions } = ipAssignmentPools;

      const combined: Partial<NetworkAndMembers> = {
        ...rest,
        network: {
          ...psqlNetworkData,
          ...controllerNetworkData,
          cidr: cidrOptions,
        },
      };
      const { members, network } = combined;

      console.log(JSON.stringify(combined, null, 2));

      // Get all members that is deleted but still active in controller (zombies).
      // Due to an issue were not possible to delete user.
      // Updated 08/2022, delete function should work if user is de-autorized prior to deleting.
      const getZombieMembers: network_members[] = await bluebird.map(
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
  deleteNetwork: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // async (_: any, { nwid }: any, context: any) => {
      // Create ZT network
      await ztController
        .network_delete(input.nwid)
        .then(async () => {
          // delete network_members
          await ctx.prisma.network_members.deleteMany({
            where: {
              nwid: input.nwid,
            },
          });
        })
        .then(async () => {
          // delete network
          await ctx.prisma.network.deleteMany({
            where: {
              authorId: ctx.session.user.id,
              nwid: input.nwid,
            },
          });
        })
        .finally(() => true)
        .catch((err: any) => {
          throw new TRPCError({
            message: err,
            code: "BAD_REQUEST",
          });
        });
    }),
  updateNetwork: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
        updateParams: z.object({
          privateNetwork: z.boolean().optional(),
          ipPool: z.union([z.array(z.string()), z.string()]).optional(),
          removeIpPool: z.string().optional(),
          name: z.string().optional(),
          routes: z
            .array(
              z.object({
                target: z.string({
                  required_error: "Via IP must has a value!",
                  // invalid_type_error: "Name must be a string",
                }),
                via: z.union([z.string(), z.null()]).optional(),
              })
            )
            .optional(),
          changeCidr: z.array(z.null()).default([]).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Construct the API request payload using the provided updateParams
      const payload: any = {};
      try {
        // Private or public network
        if (typeof input.updateParams.privateNetwork === "boolean") {
          Object.assign(
            payload,
            {},
            { private: input.updateParams.privateNetwork }
          );
        }
        // Ip pool assignments
        if (input.updateParams.ipPool) {
          // when user select a new ip subnet, it will be a CIDR string
          if (typeof input.updateParams.ipPool === "string") {
            Object.assign(payload, {}, IPv4gen(input.updateParams.ipPool));
          }

          // when user delete a ip subnet, a new array will be sent from the UI.
          if (typeof input.updateParams.ipPool === "object") {
            Object.assign(
              payload,
              {},
              { ipAssignmentPools: input.updateParams.ipPool }
            );
          }
        }

        // network name
        if (input.updateParams.name) {
          payload.name = input.updateParams.name;
          await ctx.prisma.network.update({
            where: {
              nwid: input.nwid,
            },
            data: {
              nwname: payload.name,
            },
          });
        }

        if (input.updateParams.routes) {
          payload.routes = input.updateParams.routes;
        }

        if (input.updateParams.changeCidr) {
          payload.cidr = IPv4gen(input.updateParams.changeCidr);
        }

        return await ztController.network_update(input.nwid, payload);
      } catch (err) {
        throw new TRPCError({
          message: err,
          code: "BAD_REQUEST",
        });
      }
    }),

  createNetwork: protectedProcedure.mutation(async ({ ctx }) => {
    // Generate ipv4 address, cidr, start & end
    const ipAssignmentPools = IPv4gen(null);

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
