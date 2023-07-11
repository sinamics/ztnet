/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import * as ztController from "~/utils/ztApi";
import { prisma } from "../db";

// This function checks if the given IP address is likely a private IP address
function isPrivateIP(ip: string): boolean {
  const ipInt = ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  const ranges = [
    { start: 10 << 24, end: (10 << 24) + (1 << 24) - 1 },
    {
      start: (172 << 24) + (16 << 16),
      end: (172 << 24) + (31 << 16) + (1 << 16) - 1,
    },
    {
      start: (192 << 24) + (168 << 16),
      end: (192 << 24) + (168 << 16) + (1 << 16) - 1,
    },
  ];

  return ranges.some((range) => ipInt >= range.start && ipInt <= range.end);
}

export enum ConnectionStatus {
  Offline = 0,
  Relayed = 1,
  DirectLAN = 2,
  DirectWAN = 3,
}

function determineConnectionStatus(peer: any): ConnectionStatus {
  if (!peer) {
    return ConnectionStatus.Offline;
  }

  if (peer?.latency === -1 || peer?.versionMajor === -1) {
    return ConnectionStatus.Relayed;
  }

  // Check if at least one path has a private IP
  if (peer?.paths && peer.paths.length > 0) {
    for (const path of peer?.paths) {
      const ip = path.address.split("/")[0];
      if (isPrivateIP(ip)) {
        return ConnectionStatus.DirectLAN;
      }
    }
  }

  return ConnectionStatus.DirectWAN;
}
export const updateNetworkMembers = async (zt_controller: any) => {
  // return if no members
  if (zt_controller.members.length === 0) return;

  // Get peers to view online status members
  for (const member of zt_controller.members) {
    member.peers = (await ztController.peer(member.address)) || null;
    member.creationTime = member.creationTime / 1000;
    member.conStatus = determineConnectionStatus(member.peers);
  }

  // update or create members in db
  await psql_updateMember(zt_controller.members);
};

interface MemberI {
  ipAssignments: any;
  conStatus: number;
  id: string;
  identity: string;
  authorized: boolean;
  peers: Record<any, any>;
  nwid: string;
}

const psql_updateMember = async (members: Array<MemberI>): Promise<void> => {
  if (members.length === 0) return;
  //loop array
  for (const member of members) {
    const storeValues = {
      conStatus: member.conStatus || 0,
      id: member.id,
      identity: member.identity,
      authorized: member.authorized,
      ipAssignments: member.ipAssignments,
    };

    // check if we should update lasteseen
    member.peers &&
      member.conStatus !== 0 &&
      Object.assign(storeValues, { lastseen: new Date() });

    // update members
    const updateMember = await prisma.network_members.updateMany({
      where: {
        nwid: member.nwid,
        id: member.id,
      },
      data: {
        ...storeValues,
      },
    });

    // member has been updated count
    if (updateMember.count) continue;

    // if member is not in db, add it.
    try {
      await psql_addMember(member);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
    }
  }
};

const psql_addMember = async (member: MemberI) => {
  return await prisma.network_members.create({
    data: {
      id: member.id,
      identity: member.identity,
      authorized: member.authorized,
      ipAssignments: member.ipAssignments,
      lastseen: new Date(),
      creationTime: new Date(),
      nwid_ref: {
        connect: { nwid: member.nwid },
      },
    },
  });
};
