/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import Sentencer from "sentencer";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import { updateNetworkMembers } from "../networkService";
import {
  type NetworkMembersEntity,
  type NetworkAndMembers,
  type MembersEntity,
  type ZtControllerNetwork,
} from "~/types/network";
import { Address4, Address6 } from "ip-address";
import { type APIError } from "~/server/helpers/errorHandler";

function isValidIP(ip: string): boolean {
  return Address4.isValid(ip) || Address6.isValid(ip);
}

const RouteSchema = z.object({
  target: z.string().refine(isValidCIDR, {
    message: "Destination IP must be a valid CIDR notation!",
  }),
  via: z
    .union([
      z.string().refine(isValidIP, {
        message: "Via IP must be a valid IP address!",
      }),
      z.null(),
    ])
    .optional(),
});

function isValidCIDR(cidr: string): boolean {
  const [ip, prefix] = cidr.split("/");
  const isIPv4 = isValidIP(ip);
  const isIPv6 = isValidIP(ip);
  const prefixNumber = parseInt(prefix);

  if (isIPv4) {
    return prefixNumber >= 0 && prefixNumber <= 32;
  } else if (isIPv6) {
    return prefixNumber >= 0 && prefixNumber <= 128;
  } else {
    return false;
  }
}
const RoutesArraySchema = z.array(RouteSchema);

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
          network_members: false,
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
        .catch((err: APIError) => {
          throw new TRPCError({
            message: `${err.cause.toString()} --- ${err.message}`,
            code: "BAD_REQUEST",
            cause: err.cause,
          });
        });

      // console.log(JSON.stringify(ztControllerResponse, null, 2));
      // upate db with new memebers if they not exsist
      await updateNetworkMembers(ztControllerResponse);

      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = IPv4gen(null);
      const { cidrOptions } = ipAssignmentPools;

      // merge network data from psql and zt controller
      const mergedNetwork = {
        ...psqlNetworkData,
        ...ztControllerResponse?.network,
        cidr: cidrOptions,
      };

      const combined: Partial<NetworkAndMembers> = {
        ...ztControllerResponse,
        network: mergedNetwork,
      };
      const { members, network } = combined;

      // Get all members that is deleted but still active in controller (zombies).
      // Due to an issue were not possible to delete user.
      // Updated 08/2022, delete function should work if user is de-autorized prior to deleting.
      const getZombieMembersPromises = members.map(
        async (member: MembersEntity) => {
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
      const updatedActiveMembers = await Promise.all(
        getActiveMembers.map(async (member) => {
          const peers = await ztController.peer(member.address).catch(() => []);
          const memberPeer = peers.find((peer) => peer.address === member.id);
          return {
            ...member,
            peers: memberPeer,
          };
        })
      );
      // Resolve the promises before passing them to Promise.all
      const zombieMembers = await Promise.all(getZombieMembersPromises);

      // filters out any null or undefined elements in the zombieMembers array.
      const filteredZombieMembers = zombieMembers.filter((a) => a);

      return {
        network,
        members: updatedActiveMembers,
        zombieMembers: filteredZombieMembers,
      };
    }),
  deleteNetwork: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // async (_: any, { nwid }: any, context: any) => {
      // Delete ZT network
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
        .catch((err) => {
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
          routes: RoutesArraySchema.optional(),
          changeCidr: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Construct the API request payload using the provided updateParams
      const payload: Partial<ZtControllerNetwork> = {};
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
          try {
            const validatedRoutes = RoutesArraySchema.parse(
              input.updateParams.routes
            );
            payload.routes = validatedRoutes;
          } catch (error) {
            if (error instanceof z.ZodError) {
              // Handle validation errors here
              throw new TRPCError({
                message: `Invalid routes provided ${error.message}`,
                code: "BAD_REQUEST",
              });
              throw new Error("Invalid routes provided");
            } else {
              // Handle other errors here
              throw error;
            }
          }
        }

        if (input.updateParams.changeCidr) {
          payload.cidr = IPv4gen(input.updateParams.changeCidr).cidrOptions;
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
    return (
      ztController
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
            .catch((err) => {
              // eslint-disable-next-line no-console
              console.log(err);
              // throw new ApolloError("Could not create network! Please try again");
            });
        })
        // eslint-disable-next-line no-console
        .catch((err) => console.log(err))
    );
  }),
});
