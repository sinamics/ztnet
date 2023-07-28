import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import { type NetworkAndMembers } from "~/types/network";

const isValidZeroTierNetworkId = (id: string) => {
  const hexRegex = /^[0-9a-fA-F]{10}$/;
  return hexRegex.test(id);
};

export const networkMemberRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
    });
    return networks;
  }),
  getMemberById: protectedProcedure
    .input(
      z.object({
        id: z.string({ required_error: "No member id provided!" }),
        nwid: z.string({ required_error: "No network id provided!" }),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.network_members.findFirst({
        where: {
          id: input.id,
          nwid: input.nwid,
        },
      });
    }),
  create: protectedProcedure
    .input(
      z.object({
        id: z
          .string({ required_error: "No member id provided!" })
          .refine(isValidZeroTierNetworkId, {
            message:
              "Invalid ZeroTier network id provided. It should be a 10-digit hexadecimal number.",
          }),
        nwid: z.string({ required_error: "No network id provided!" }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // check if user exist in db, and if so set deleted:false
      const member = await ctx.prisma.network_members.findUnique({
        where: {
          id_nwid: {
            id: input.id,
            nwid: input.nwid, // this should be the value of `nwid` you are looking for
          },
        },
      });
      if (member) {
        return await ctx.prisma.network_members.update({
          where: {
            id_nwid: {
              id: input.id,
              nwid: input.nwid, // this should be the value of `nwid` you are looking for
            },
          },
          data: {
            deleted: false,
          },
        });
      }

      // if not, create new member
      await ctx.prisma.network_members.create({
        data: {
          id: input.id,
          authorized: false,
          ipAssignments: [],
          lastseen: new Date(),
          creationTime: new Date(),
          nwid_ref: {
            connect: { nwid: input.nwid },
          },
        },
      });
    }),

  Update: protectedProcedure
    .input(
      z.object({
        nwid: z.string({ required_error: "No network id provided!" }),
        memberId: z.string({ required_error: "No member id provided!" }),
        updateParams: z.object({
          activeBridge: z.boolean().optional(),
          noAutoAssignIps: z.boolean().optional(),
          ipAssignments: z
            .array(z.string({ required_error: "No Ip assignment provided!" }))
            .optional(),
          authorized: z
            .boolean({ required_error: "No boolean value provided!" })
            .optional(),
          capabilities: z.array(z.number()).optional(),
          tags: z.array(z.tuple([z.number(), z.number()])).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payload: Partial<NetworkAndMembers> = {};

      // update capabilities
      if (typeof input.updateParams.capabilities === "object") {
        // update member
        Object.assign(
          payload,
          {},
          { capabilities: input.updateParams.capabilities }
        );
      }

      // update tags
      if (typeof input.updateParams.tags === "object") {
        // update member
        Object.assign(payload, {}, { tags: input.updateParams.tags });
      }
      // update noAutoAssignIps
      if (typeof input.updateParams.activeBridge === "boolean") {
        // update member
        Object.assign(
          payload,
          {},
          { activeBridge: input.updateParams.activeBridge }
        );
      }
      // update noAutoAssignIps
      if (typeof input.updateParams.noAutoAssignIps === "boolean") {
        // update member
        Object.assign(
          payload,
          {},
          { noAutoAssignIps: input.updateParams.noAutoAssignIps }
        );
      }

      // update ip specified by user UI
      if (input.updateParams.ipAssignments) {
        // update member
        Object.assign(
          payload,
          {},
          { ipAssignments: input.updateParams.ipAssignments }
        );
      }

      // update authorized
      if (typeof input.updateParams.authorized === "boolean") {
        Object.assign(
          payload,
          {},
          { authorized: input.updateParams.authorized }
        );
      }

      const updatedMember = await ztController
        .member_update(input.nwid, input.memberId, payload)
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
                  noAutoAssignIps: updatedMember.noAutoAssignIps,
                  activeBridge: updatedMember.activeBridge,
                  tags: updatedMember.tags,
                  capabilities: updatedMember.capabilities,
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
        // eslint-disable-next-line no-console
        .catch((err: string) => console.log(err));
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
  UpdateDatabaseOnly: protectedProcedure
    .input(
      z.object({
        nwid: z.string(),
        id: z.string(),
        updateParams: z.object({
          // ipAssignments: z
          //   .array(z.string({ required_error: "No Ip assignment provided!" }))
          //   .optional(),
          deleted: z.boolean().optional(),
          name: z.string().optional(),
        }),
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
              where: {
                id_nwid: {
                  id: input.id,
                  nwid: input.nwid, // this should be the value of `nwid` you are looking for
                },
              },
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
      return { member: response.network_members[0] };
    }),
  stash: protectedProcedure
    .input(
      z
        .object({
          nwid: z.string({ required_error: "network ID not provided!" }),
          id: z.string({ required_error: "id not provided!" }),
        })
        .required()
    )
    .mutation(async ({ ctx, input }) => {
      const caller = networkMemberRouter.createCaller(ctx);
      //user needs to be de-authorized before deleted.

      // adding try catch to prevent error if user is not part of the network but still in the database.
      try {
        await caller.Update({
          memberId: input.id,
          nwid: input.nwid,
          updateParams: { authorized: false },
        });
      } catch (error) {}

      // Set member with deleted status in database.
      await ctx.prisma.network
        .update({
          where: {
            nwid: input.nwid,
          },
          data: {
            network_members: {
              updateMany: {
                where: { id: input.id, nwid: input.nwid },
                data: {
                  deleted: true,
                },
              },
            },
          },
          include: {
            network_members: {
              where: {
                id: input.id,
                deleted: false,
              },
            },
          },
        })
        // eslint-disable-next-line no-console
        .catch((err: string) => console.log(err));
    }),
  delete: protectedProcedure
    .input(
      z
        .object({
          nwid: z.string({ required_error: "network ID not provided!" }),
          id: z.string({ required_error: "memberId not provided!" }),
        })
        .required()
    )
    .mutation(async ({ ctx, input }) => {
      // remove member from controller
      await ztController.member_delete({
        nwid: input.nwid,
        memberId: input.id,
      });

      await ctx.prisma.network_members.delete({
        where: {
          id_nwid: {
            id: input.id,
            nwid: input.nwid, // this should be the value of `nwid` you are looking for
          },
        },
      });
    }),
  getMemberAnotations: protectedProcedure
    .input(
      z.object({
        nwid: z.string(),
        nodeid: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.networkMemberNotation.findMany({
        where: {
          nodeid: input.nodeid,
        },
        include: {
          label: true,
        },
      });
    }),
  removeMemberAnotations: protectedProcedure
    .input(
      z.object({
        notationId: z.number(),
        nodeid: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.networkMemberNotation.delete({
        where: {
          notationId_nodeid: {
            notationId: input.notationId,
            nodeid: input.nodeid,
          },
        },
      });

      // Check if the notation is still used by any other member
      const otherNotations = await ctx.prisma.networkMemberNotation.findMany({
        where: {
          notationId: input.notationId,
        },
      });

      // If the notation is not used by any other member, delete it
      if (otherNotations.length === 0) {
        await ctx.prisma.notation.delete({
          where: {
            id: input.notationId,
          },
        });
      }
    }),
});
