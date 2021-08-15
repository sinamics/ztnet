import map from 'lodash/map';
const NetworkService = require('../../../db/postgres/prisma');
const zt = require('../../_utils/zt_api');

export const psql_updateMembers = (members: Array<any>) =>
  new Promise((resolve) => {
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
          identity: member.identity,
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
          identity: member.identity,
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

// TODO when user add manually, check if member exsist from controller API and notify user
// Return db values
export const psql_fetchMembers = (nwid: string) =>
  new Promise(async (resolve) => {
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
