/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";

export const networkMemberRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
    });
    return networks;
  }),
  Update: protectedProcedure
    .input(
      z.object({
        nwid: z.string({ required_error: "No network id provided!" }),
        memberId: z.string({ required_error: "No member id provided!" }),
        updateParams: z.object({
          ipAssignments: z
            .array(z.string({ required_error: "No Ip assignment provided!" }))
            .optional(),
          authorized: z
            .boolean({ required_error: "No boolean value provided!" })
            .optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payload: any = {};

      // remove ip specified by user UI
      if (input.updateParams.ipAssignments) {
        // update member
        Object.assign(
          payload,
          {},
          { ipAssignments: input.updateParams.ipAssignments }
        );
      }

      if (typeof input.updateParams.authorized === "boolean") {
        // update member
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
  UpdateDatabaseOnly: protectedProcedure
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
  Delete: protectedProcedure
    .input(
      z.object({
        nwid: z.string({ required_error: "network ID not provided!" }),
        memberId: z.string({ required_error: "memberId not provided!" }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // remove member from controller
      await ztController
        .member_delete(input)
        .catch(() => console.log("Member does not exist in controller!"));

      // Set member with deleted status in database.
      return await ctx.prisma.network
        .update({
          where: {
            nwid: input.nwid,
          },
          data: {
            network_members: {
              updateMany: {
                where: { id: input.memberId, nwid: input.nwid },
                data: {
                  deleted: true,
                },
              },
            },
          },
          include: {
            network_members: {
              where: {
                id: input.memberId,
              },
            },
          },
        })
        .catch((err: any) => console.log(err));
    }),
});
