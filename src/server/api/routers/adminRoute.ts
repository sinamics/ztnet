import { z } from "zod";
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

    // await ctx.prisma.user.findMany();
  }),

  getControllerStats: adminRoleProtectedRoute
    .input(
      z.object({
        userid: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const controllerVersion = await ztController.get_controller_version();

      const networks = await ztController.get_controller_networks();

      const nodes = [];
      let totalNodes = 0;
      for (let index = 0; index < networks.length; index++) {
        const networkMembers = await ctx.prisma.network.findFirst({
          where: {
            nwid: networks[index],
          },
          include: {
            nw_userid: true,
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        const nDet = await ztController.network_detail(networks[index]);
        totalNodes += nDet.members.length;
        nodes.push({ ...nDet, author: { ...networkMembers } });
      }
      // admin wants networks for a specific user
      if (input.userid && !isNaN(input.userid)) {
        const filterNodes = nodes.filter(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
          (u: any) => u.author.authorId === input.userid
        );
        return {
          controllerVersion,
          nodes: filterNodes,
          stats: { totalNodes, totalNetworks: nodes.length },
        };
      }

      return {
        controllerVersion,
        nodes,
        stats: { totalNodes, totalNetworks: nodes.length },
      };
    }),
});
