import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
// import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
  getUsers: adminRoleProtectedRoute.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        lastLogin: true,
        lastseen: true,
        online: true,
        role: true,
        _count: {
          select: {
            network: true,
          },
        },
        // network: {
        //   select: {
        //     nwid: true,
        //     nwname: true,
        //   },
        // },
      },
    });
    return users;

    // await ctx.prisma.user.findMany();
  }),
});
