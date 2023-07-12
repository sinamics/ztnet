import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import {
  type Config,
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import { handleAutoAssignIP, updateNetworkMembers } from "../networkService";
import { Address4, Address6 } from "ip-address";
import {
  type NetworkAndMembers,
  type MembersEntity,
  type ZtControllerNetwork,
  type IpAssignmentPoolsEntity,
  type Peers,
  type NetworkEntity,
} from "~/types/network";
import { type APIError } from "~/server/helpers/errorHandler";
import { type network_members } from "@prisma/client";

const customConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: "-",
  length: 2,
};

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
  getUserNetworks: protectedProcedure.query(async ({ ctx }) => {
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
      include: {
        network_members: {
          select: {
            id: true,
          },
        },
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

      // console.log(JSON.stringify(ztControllerResponse, null, 2));
      // upate db with new memebers if they not exsist
      await updateNetworkMembers(ztControllerResponse);

      // Get available cidr options.
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
        getActiveMembers.map(async (member: network_members) => {
          const peers = await ztController.peer(member.address).catch(() => []);
          const memberPeer = peers.find(
            (peer: Peers) => peer.address === member.id
          ) as Peers | undefined;
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
      try {
        // Delete ZT network
        await ztController.network_delete(input.nwid);

        // Delete network_members
        await ctx.prisma.network_members.deleteMany({
          where: {
            nwid: input.nwid,
          },
        });

        // Delete network
        await ctx.prisma.network.deleteMany({
          where: {
            authorId: ctx.session.user.id,
            nwid: input.nwid,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new TRPCError({
            message: `Invalid routes provided ${error.message}`,
            code: "BAD_REQUEST",
          });
        } else {
          throw error;
        }
      }
    }),
  updateNetwork: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
        updateParams: z.object({
          privateNetwork: z.boolean().optional(),
          ipPool: z.string().optional(),
          removeIpPool: z.string().optional(),
          name: z.string().optional(),
          routes: RoutesArraySchema.optional(),
          changeCidr: z.string().optional(),
          autoAssignIp: z.boolean().optional().default(true),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Construct the API request payload using the provided updateParams
      const ztControllerUpdates: Partial<ZtControllerNetwork> = {};
      const prismaUpdates: Partial<NetworkEntity> = {};

      try {
        const {
          privateNetwork,
          ipPool,
          name,
          routes,
          changeCidr,
          autoAssignIp,
        } = input.updateParams;

        if (typeof privateNetwork === "boolean") {
          ztControllerUpdates.private = privateNetwork;
        }

        // If the network is set to auto-assign IP addresses, and an IP pool has been specified,
        // generate a new IP pool object using the IPv4gen function and assign it to the ztControllerUpdates.
        // If the IP pool is specified as an array, it is assigned directly to the ztControllerUpdates.
        if (ipPool && autoAssignIp) {
          if (typeof ipPool === "string") {
            Object.assign(ztControllerUpdates, IPv4gen(ipPool));
          } else if (Array.isArray(ipPool)) {
            ztControllerUpdates.ipAssignmentPools =
              ipPool as IpAssignmentPoolsEntity[];
          }

          if (ztControllerUpdates.routes.length > 0) {
            prismaUpdates.ipAssignments = ztControllerUpdates.routes[0].target;
          }
        }

        // Network name
        if (name) {
          prismaUpdates.nwname = name;
        }

        // Auto assign IP
        if (typeof autoAssignIp === "boolean") {
          prismaUpdates.autoAssignIp = autoAssignIp;
        }

        if (routes) {
          try {
            ztControllerUpdates.routes = RoutesArraySchema.parse(routes);
          } catch (error) {
            if (error instanceof z.ZodError) {
              throw new TRPCError({
                message: `Invalid routes provided ${error.message}`,
                code: "BAD_REQUEST",
              });
            } else {
              throw error;
            }
          }
        }

        if (changeCidr) {
          ztControllerUpdates.cidr = IPv4gen(changeCidr).cidrOptions;
        }

        // Update network in prisma
        await ctx.prisma.network.update({
          where: { nwid: input.nwid },
          data: prismaUpdates,
        });

        if (typeof autoAssignIp === "boolean") {
          await handleAutoAssignIP(
            autoAssignIp,
            ztControllerUpdates,
            ctx,
            input
          );
        }

        return await ztController.network_update(
          input.nwid,
          ztControllerUpdates
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new TRPCError({
            message: `Invalid routes provided ${error.message}`,
            code: "BAD_REQUEST",
          });
        } else {
          throw error;
        }
      }
    }),
  createNetwork: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = IPv4gen(null);

      // Generate adjective and noun word
      const networkName: string = uniqueNamesGenerator(customConfig);

      // Create ZT network
      const newNw = await ztController.network_create(
        networkName,
        ipAssignmentPools
      );

      // Store the created network in the database
      const updatedUser = await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          network: {
            create: {
              nwname: newNw.name,
              nwid: newNw.nwid,
              ipAssignments: newNw.routes[0].target,
            },
          },
        },
        select: {
          network: true,
        },
      });

      return updatedUser;
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Log the error and throw a custom error message
        // eslint-disable-next-line no-console
        console.error(err);
        throw new TRPCError({
          message: "Could not create network! Please try again",
          code: "BAD_REQUEST",
        });
      } else {
        // Throw a generic error for unknown error types
        throw new TRPCError({
          message: "An unknown error occurred",
          code: "BAD_REQUEST",
        });
      }
    }
  }),
});
