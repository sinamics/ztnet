import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as ztController from "~/utils/ztApi";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const settingsRouter = createTRPCRouter({
  setZtApi: protectedProcedure
    .input(
      z.object({
        ztCentralApiKey: z.string().optional(),
        ztCentralApiUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.globalOptions.update({
        where: {
          id: 1,
        },
        data: {
          ...input,
        },
      });

      if (updated.ztCentralApiKey) {
        try {
          await ztController.ping_api();
          return { status: "success" };
        } catch (error) {
          throw new TRPCError({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            message: error.message,
            code: "FORBIDDEN",
          });
        }
      }

      return updated;
    }),
});
