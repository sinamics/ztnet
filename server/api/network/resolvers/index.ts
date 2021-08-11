import { fetchControllerIntervall } from '../../_utils/zt_listner';

const { ApolloError } = require('apollo-server-express');
const { isAuthenticated } = require('../../../middleware/authorization/user.is.authenticated');
const zt = require('../../_utils/zt.ts');
const { map } = require('lodash');
const IP = require('../../_utils/ipGenerator');
const Sentencer = require('sentencer');
const NetworkService = require('../../../db/postgres/prisma');
const bluebird = require('bluebird');

const withCancel = (asyncIterator: any, onCancel: any) => {
  const asyncReturn = asyncIterator.return;

  asyncIterator.return = () => {
    onCancel();
    return asyncReturn ? asyncReturn.call(asyncIterator) : Promise.resolve({ value: undefined, done: true });
  };

  return asyncIterator;
};

const networkResolvers = {
  Query: {
    allNetworks: async (_: any, __: any, context: any) => {
      const authUser = await isAuthenticated(context);
      // only find nw related to current user!
      return await NetworkService.network.findMany({
        where: {
          authorId: authUser.userid,
        },
      });
    },
    networkDetails: async (_: any, { nwid }: any, context: any) => {
      const authUser = await isAuthenticated(context);
      const isAdmin = authUser.role.includes('ADMIN');
      const networkAuthor = await NetworkService.network.findFirst({
        where: {
          AND: [
            {
              authorId: { equals: authUser.userid },
              nwid: { equals: nwid },
            },
          ],
        },
        include: {
          network_members: true,
        },
      });

      // Only return nw details for author user!
      if (!networkAuthor && !isAdmin) throw new ApolloError('You are not the Author of this network!');

      // Return nw obj details
      let nwDetails = await zt.network_detail(isAdmin ? nwid : networkAuthor.nwid).catch((err: any) => {
        throw new ApolloError(err);
      });

      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = IP.randomIPv4();

      // Copy in data from network db
      nwDetails.network = { ...nwDetails.network, ...networkAuthor, cidr: ipAssignmentPools.cidrOptions };

      const { members, network } = nwDetails;

      const updateMemberPromise = new Promise((resolve) => {
        if (!members.length) resolve([]);

        map(members, async (member: any) => {
          const updateMember = await NetworkService.network_members.updateMany({
            where: {
              nwid: member.nwid,
              id: member.id,
            },
            data: {
              lastseen: new Date(),
              id: member.id,
              online: false,
              authorized: member.authorized,
              address: member.address,
              ip: member.ipAssignments,
            },
          });
          if (updateMember.count) return resolve(updateMember);

          const createMember = await NetworkService.network_members.create({
            data: {
              creationTime: new Date(),
              id: member.id,
              online: false,
              authorized: member.authorized,
              address: member.address,
              ip: member.ipAssignments,
              nwid_ref: {
                connect: { nwid: member.nwid },
              },
            },
          });
          resolve(createMember);
        });
      });

      // If no members we jsut ship the previous members and network details
      // if (!members.length) return { network, members };
      // TODO when user add manually, check if member exsist from controller API and notify user
      // Return db values
      const fetchMemberPromise = new Promise(async (resolve) => {
        const getMembers = await NetworkService.network_members.findMany({
          where: {
            nwid,
            deleted: false,
          },
        });

        // Get peers to view online status members
        const peers = await zt.peers();
        for (const member of getMembers) {
          member.peers = peers.find((x: any) => x.address === member.address) || null;
          // Example::
          // {
          //   versionMajor: 1,
          //   latency: -1,
          //   paths: [{ lastReceive: 1627763576642 }],
          // };
        }
        resolve(getMembers);
      });

      // Get all members that is deleted but still active in controller (zombies).
      // Due to an issue were not possible to delete user.

      const getZombieMembers = await bluebird.map(members, async (member: any) => {
        return await NetworkService.network_members.findFirst({
          where: {
            nwid,
            id: member.id,
            deleted: true,
          },
        });
      });

      return Promise.all([updateMemberPromise, fetchMemberPromise, getZombieMembers]).then(async (res) => {
        const zombieMembers = res[2].filter((a: any) => a);
        return { network, members: res[1], zombieMembers };
      });
    },
  },
  Mutation: {
    createNetwork: async (_: any, __: any, context: any) => {
      const authUser = await isAuthenticated(context);
      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = IP.randomIPv4();

      // Generate adjective and noun word
      const networkName = Sentencer.make('{{ adjective }}_{{ noun }}');

      // Create ZT network
      return zt
        .network_create(networkName, ipAssignmentPools)
        .then(async (newNw: { name: string; nwid: string }) => {
          // store the created User in db
          return await NetworkService.users.update({
            where: {
              userid: authUser.userid,
            },
            data: {
              network: {
                create: {
                  nwname: newNw.name,
                  nwid: newNw.nwid,
                },
              },
            },
            select: {
              network: true,
            },
          });
        })
        .catch((err: any) => {
          console.log(err);
          throw new ApolloError('Could not create network! Please try again');
        });
    },
    deleteNetwork: async (_: any, { nwid }: any, context: any) => {
      const authUser = await isAuthenticated(context);
      // Create ZT network
      await zt
        .network_delete(nwid)
        .then(async () => {
          // delete network_members
          await NetworkService.network_members.deleteMany({
            where: {
              nwid,
            },
          });
        })
        .then(async () => {
          // delete network
          await NetworkService.network.deleteMany({
            where: {
              authorId: authUser.userid,
              nwid,
            },
          });
        })
        .finally(() => true)
        .catch((err: any) => {
          console.log(err);
          throw new ApolloError('Something went wrong! Please try again', err);
        });
    },
    updateNetwork: async (_: any, { nwid, data }: any, context: any) => {
      await isAuthenticated(context);
      if (data.changeCidr) {
        data = IP.randomIPv4(data.changeCidr);
      }

      // update new network name TODO : make more generic
      if (data.hasOwnProperty('name')) {
        await NetworkService.network.update({
          where: {
            nwid: nwid,
          },
          data: {
            nwname: data.name,
          },
        });
      }

      // Update ZT network
      return await zt.network_update(nwid, data).catch((err: any) => new ApolloError(err));
    },
    memberUpdateDatabaseOnly: async (_: any, { nwid, nodeid, data }: any) => {
      // if users click the re-generate icon on IP address
      const returnNewMember = await NetworkService.network.update({
        where: {
          nwid: nwid,
        },
        data: {
          network_members: {
            update: {
              where: { nodeid: parseInt(nodeid) },
              data: {
                ...data,
              },
            },
          },
        },
        include: {
          network_members: {
            where: {
              nodeid: parseInt(nodeid),
            },
          },
        },
      });

      return { member: returnNewMember.network_members[0] };
    },
    memberUpdate: async (_: any, nw: any) => {
      // if users click the re-generate icon on IP address
      if (nw.data && nw.data.generateIp4) {
        // Generate ipv4 address, cidr, start & end
        //TODO add options in UI for IPv4 selector
        const ipAssignmentPools = IP.randomIPv4();
        await zt.network_update(nw.nwid, ipAssignmentPools);
        // Generate new ipv4 address by passing in empty array '10.24.118.16'
        nw.data = Object.assign({}, { ipAssignments: [], noAutoAssignIps: false });
      }

      // remove ip specified by user UI
      if (nw.data && nw.data.hasOwnProperty('removeIp4index')) {
        const { ipAssignments, removeIp4index } = nw.data;
        // slice out ip
        ipAssignments.splice(removeIp4index, 1);

        // update controller
        let t = await zt.member_update(nw.nwid, nw.memberId, { ipAssignments }).catch((err: any) => console.log(err));

        return t;
      }

      const updatedMember = await zt.member_update(nw.nwid, nw.memberId, nw.data).catch(() => {
        throw new ApolloError(
          'Member does not exsist in the network, did you add this device manually? \r\n Make sure it has properly joined the network'
        );
      });

      const returnNewMember = await NetworkService.network
        .update({
          where: {
            nwid: nw.nwid,
          },
          data: {
            network_members: {
              updateMany: {
                where: { id: nw.memberId, nwid: nw.nwid },
                data: {
                  ip: updatedMember.ipAssignments,
                  authorized: updatedMember.authorized,
                },
              },
            },
          },
          include: {
            network_members: {
              where: {
                id: nw.memberId,
                nwid: nw.nwid,
              },
            },
          },
        })
        .catch((err: any) => console.log(err));
      return { member: returnNewMember.network_members[0] };
    },
    removeMember: async (_: any, data: any) => {
      if (!data.nwid || !data.memberId) throw new ApolloError('An error occured. Code: 1001');
      // remove from controller
      // Its not possible to delete a user from the controller currently.
      // https://github.com/zerotier/ZeroTierOne/issues/859
      await zt.member_delete(data).catch(() => console.log('Member does not exist in controller!'));

      // Set user "not authorized" due to the delete member issue above.
      networkResolvers.Mutation.memberUpdate(null, { nwid: data.nwid, memberId: data.memberId, data: { authorized: false } });

      // Set member with deleted status in database.
      return await NetworkService.network
        .update({
          where: {
            nwid: data.nwid,
          },
          data: {
            network_members: {
              updateMany: {
                where: { id: data.memberId, nwid: data.nwid },
                data: {
                  deleted: true,
                },
              },
            },
          },
          include: {
            network_members: {
              where: {
                id: data.memberId,
              },
            },
          },
        })
        .catch((err: any) => console.log(err));
    },
    addMember: async (_: any, data: any) => {
      // Set member with deleted status in database.
      // Its not possible to delete a user from the controller currently.
      // https://github.com/zerotier/ZeroTierOne/issues/859
      const updateMember = await NetworkService.network_members
        .updateMany({
          where: {
            nwid: data.nwid,
            id: data.memberId,
          },
          data: {
            deleted: false,
          },
        })
        .catch((err: any) => console.log(err));
      //if we updated a user, send back updated user to UI
      if (updateMember.count)
        return await NetworkService.network_members
          .findFirst({
            where: {
              nwid: data.nwid,
              id: data.memberId,
              deleted: false,
            },
          })
          .then((member: any) => ({ member }))
          .catch((err: any) => console.log(err));

      return await NetworkService.network_members
        .create({
          data: {
            id: data.memberId,
            deleted: false,
            creationTime: new Date(),
            nwid_ref: {
              connect: { nwid: data.nwid },
            },
          },
        })
        .then((member: any) => ({ member }))
        .catch((err: any) => console.log(err));
    },
  },
  Subscription: {
    memberInformation: {
      subscribe: async (_: any, { nwid }: any, { pubsub }: any) => {
        // await fetchControllerIntervall(pubsub, nwid, false);
        return withCancel(await pubsub.asyncIterator([nwid]), async () => {
          await fetchControllerIntervall(pubsub, nwid, true);
        });
      },
      resolve: (payload: any) => {
        // console.log(payload);
        return { ...payload };
      },
    },
  },
};

module.exports = {
  networkResolvers,
};
