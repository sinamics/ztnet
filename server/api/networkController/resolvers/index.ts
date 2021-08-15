const Controller = require('../../_utils/zt_api');
const NetworkServices = require('../../../db/postgres/prisma');

const controllerResolvers = {
  Query: {
    controllerStats: async (_: any, __: any) => {
      const controllerVersion = await Controller.get_controller_version();
      const networks = await Controller.get_controller_networks();

      const nodes = [];
      let totalNodes = 0;
      for (let index = 0; index < networks.length; index++) {
        const networkMembers = await NetworkServices.network.findFirst({
          where: {
            nwid: networks[index],
          },
          include: {
            nw_userid: true,
          },
        });

        const nDet = await Controller.network_detail(networks[index]);
        totalNodes += nDet.members.length;
        nodes.push({ ...nDet, author: { ...networkMembers } });
      }

      return { controllerVersion, nodes, stats: { totalNodes, totalNetworks: nodes.length } };
    },
  },
};

module.exports = {
  controllerResolvers,
};
