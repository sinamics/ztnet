const { ApolloError: UserError } = require('apollo-server-express');
const UserService = require('../../../db/postgres/prisma');
const zerotier = require('../../_utils/zt');
const BlueBird = require('bluebird');

const userResolvers = {
  Query: {
    getUsers: async (_: any, __: any) => {
      return await UserService.users.findMany();
    },
    getUser: (_: any, __: any) => {
      // console.log(_._id);
    },
  },

  Mutation: {
    updateUser: async (_: any, { userid, user }: any, __: any) => {
      return await UserService.users
        .update({
          where: {
            userid: parseInt(userid),
          },
          data: {
            ...user,
          },
        })
        .catch((err: any) => new UserError(err));
    },
    removeUser: async (_: any, { userid }: any, __: any) => {
      const currentUser = await UserService.users.findFirst({
        where: {
          userid: parseInt(userid),
        },
        include: {
          network: {
            include: {
              network_members: true,
            },
          },
        },
      });

      // Using Promise.map:
      const deleteMembers = await BlueBird.map(currentUser.network, async (member: { nwid: any; id: any }) => {
        // Promise.map awaits for returned promises as well.
        await UserService.network_members.deleteMany({
          where: {
            nwid: member.nwid,
            id: member.id,
          },
        });
      });

      const deleteControllerNetworks = await BlueBird.map(currentUser.network, async (member: { nwid: any; id: any }) => {
        // Promise.map awaits for returned promises as well.
        return zerotier.network_delete(member.nwid);
      });

      const deleteDatabaseNetworks = await BlueBird.map(currentUser.network, async (member: { nwid: any; id: any }) => {
        // Promise.map awaits for returned promises as well.
        await UserService.network.delete({
          where: {
            nwid: member.nwid,
          },
        });
      });

      // Finally delete user
      return Promise.all([deleteMembers, deleteControllerNetworks, deleteDatabaseNetworks]).then(async () => {
        await UserService.users
          .delete({
            where: {
              userid: parseInt(userid),
            },
          })
          .then(() => true);
      });
    },
  },
};

module.exports = {
  userResolvers,
};
