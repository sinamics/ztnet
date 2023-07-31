import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as centralApi from "~/utils/ztCentralApi";

export const ztCentralRouter = createTRPCRouter({
  update: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().optional(),
        apiUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.globalOptions.update({
        where: {
          id: 1,
        },
        data: {
          ztCentralApiKey: input.apiKey,
          ztCentralApiUrl: input.apiUrl,
        },
      });
    }),
  getCentralNetworks: protectedProcedure.query(async () => {
    const test = await centralApi.get_controller_networks();
    // const create = await centralApi.network_detail("83048a0632c0443d");
    // console.log(test);

    return test;
  }),
  getCentralNetworkById: protectedProcedure
    .input(
      z.object({
        nwid: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { network, members } = await centralApi.network_detail(input.nwid);

      return {
        network: network.config || {},
        members,
      };
    }),
});
