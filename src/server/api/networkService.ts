/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

// import { PubSub } from "apollo-server-express";

import * as ztController from "~/utils/ztApi";
import { prisma } from "../db";

// const arrOfNetworks = new Set();
// let timeout: ReturnType<typeof setTimeout>;

// Fetch data for online users and push them via wesocket.
// TODO i user has two tabs open on the same page, this logic will break, or data will not be pushed if one tab is closed.
// Need to store number of session in the array

export const updateNetworkMembers = async (
  zt_controller: any
  //   unsubscribe: boolean
) => {
  //   arrOfNetworks.add(nwid);
  //   const memberResults = (fn: () => void) =>
  //   Promises.map(arrOfNetworks, async (_nwid: any) => {
  //   const zt_controller = await ztController.network_detail(nwid);
  // return if no members
  if (zt_controller.members.length === 0) return;

  // Get peers to view online status members
  for (const member of zt_controller.members) {
    member.peers = (await ztController.peer(member.address)) || null;
    member.creationTime = member.creationTime / 1000;

    // user is in direct mode.
    if (
      member.peers &&
      member.peers?.latency !== -1 &&
      member.peers?.versionMajor !== -1
    ) {
      member.conStatus = 2;
      continue;
    }

    // user is online with relayed connection
    if (member.peers && member.peers?.latency === -1) {
      member.conStatus = 1;
      continue;
    }

    // user is offline.
    member.conStatus = 0;
  }

  // update or create members in db
  await psql_updateMember(zt_controller.members);

  // push data to websocket
  //   return pubsub.publish(_nwid, { members: zt_controller.members });
  //   }).then(() => fn());

  //   if (unsubscribe) {
  //     arrOfNetworks.delete(nwid);
  //     return clearTimeout(timeout);
  //   }

  // wait 10sec after proccess has finished. No race condition
  //   function recursion() {
  //     if (timeout) clearTimeout(timeout);
  //     timeout = setTimeout(async () => {
  //       await memberResults(recursion);
  //     }, 10000);
  //   }

  //   await memberResults(recursion);
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
