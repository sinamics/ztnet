import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
import * as ztController from "~/utils/ztApi";

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
  }),

  getControllerStats: adminRoleProtectedRoute.query(async () => {
    const networks = await ztController.get_controller_networks();

    const networkCount = networks.length;
    let totalMembers = 0;
    for (const network of networks) {
      const members = await ztController.network_members(network);
      totalMembers += Object.keys(members).length;
    }

    const controllerStatus = await ztController.get_controller_status();
    return {
      networkCount,
      totalMembers,
      controllerStatus,
    };
  }),
});
