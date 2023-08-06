import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import { type MemberEntity } from "~/types/local/member";
import { type CentralMembers } from "~/types/central/members";

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
        central: z.boolean().default(false),
        id: z.string({ required_error: "No member id provided!" }),
        nwid: z.string({ required_error: "No network id provided!" }),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.central) {
        const memberDetails = await ztController.member_details(
          input.nwid,
          input.id,
          input.central
        );
        return ztController.flattenCentralMember(
          memberDetails as CentralMembers
        );
      }
      return await ctx.prisma.networkMembers.findFirst({
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
        central: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.central) {
        return await ztController.member_update({
          nwid: input.nwid,
          memberId: input.id,
          central: input.central,
          updateParams: {
            hidden: false,
          },
        });
      }
      // check if user exist in db, and if so set deleted:false
      const member = await ctx.prisma.networkMembers.findUnique({
        where: {
          id_nwid: {
            id: input.id,
            nwid: input.nwid, // this should be the value of `nwid` you are looking for
          },
        },
      });
      if (member) {
        return await ctx.prisma.networkMembers.update({
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
      await ctx.prisma.networkMembers.create({
        data: {
          id: input.id,
          authorized: false,
          ipAssignments: [],
          lastSeen: new Date(),
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
        central: z.boolean().default(false),
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
      const payload: Partial<MemberEntity> = {};

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

      const updateParams = input.central
        ? { config: { ...payload } }
        : { ...payload };

      // if central is true, send the request to the central API and return the response
      const updatedMember = await ztController
        .member_update({
          nwid: input.nwid,
          memberId: input.memberId,
          central: input.central,
          // @ts-expect-error
          updateParams,
        })
        .catch(() => {
          throw new TRPCError({
            message:
              "Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network",
            code: "FORBIDDEN",
          });
        });

      if (input.central) return updatedMember;

      const response = await ctx.prisma.network
        .update({
          where: {
            nwid: input.nwid,
          },
          data: {
            networkMembers: {
              updateMany: {
                where: { id: input.memberId, nwid: input.nwid },
                data: {
                  ipAssignments: updatedMember.ipAssignments,
                  authorized: updatedMember.authorized,
                  noAutoAssignIps: updatedMember.noAutoAssignIps,
                  activeBridge: updatedMember.activeBridge,
                  // @ts-expect-error
                  tags: updatedMember.tags,
                  capabilities: updatedMember.capabilities,
                },
              },
            },
          },
          include: {
            networkMembers: {
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

      if ("networkMembers" in response) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { member: response.networkMembers[0] };
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
        central: z.boolean().default(false),
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
      // if central is true, send the request to the central API and return the response
      if (input.central && input?.updateParams?.name) {
        return await ztController
          .member_update({
            nwid: input.nwid,
            memberId: input.id,
            central: input.central,
            updateParams: input.updateParams,
          })
          .catch(() => {
            throw new TRPCError({
              message:
                "Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network",
              code: "FORBIDDEN",
            });
          });
      }

      // if users click the re-generate icon on IP address
      const response = await ctx.prisma.network.update({
        where: {
          nwid: input.nwid,
        },
        data: {
          networkMembers: {
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
          networkMembers: {
            where: {
              id: input.id,
            },
          },
        },
      });
      return { member: response.networkMembers[0] };
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
            networkMembers: {
              updateMany: {
                where: { id: input.id, nwid: input.nwid },
                data: {
                  deleted: true,
                },
              },
            },
          },
          include: {
            networkMembers: {
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
          central: z.boolean().default(false),
          nwid: z.string({ required_error: "network ID not provided!" }),
          id: z.string({ required_error: "memberId not provided!" }),
        })
        .required()
    )
    .mutation(async ({ ctx, input }) => {
      // remove member from controller
      const deleted = await ztController.member_delete({
        central: input.central,
        nwid: input.nwid,
        memberId: input.id,
      });

      if (input.central) return deleted;

      await ctx.prisma.networkMembers.delete({
        where: {
          id_nwid: {
            id: input.id,
            nwid: input.nwid,
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
