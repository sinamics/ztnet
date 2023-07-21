import { z } from "zod";
import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";

export const globalOptionsRouter = createTRPCRouter({
  update: adminRoleProtectedRoute
    .input(
      z.object({
        enableRegistration: z.boolean().optional(),
        firstUserRegistration: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.globalOptions.update({
        where: {
          id: 1,
        },
        data: {
          ...input,
        },
      });
    }),
});
