import map from 'lodash/map';
import Promises from 'bluebird';
import { psql_fetchMembersInNetwork, psql_updateOrCreateMembers } from './members';

const _zt = require('../../_utils/zt_api');

let arrOfNetworks = new Set();
let timeout: ReturnType<typeof setTimeout>;

// Fetch data for online users and push them via wesocket.
// TODO i user has two tabs open on the same page, this logic will break, or data will not be pushed if one tab is closed.
// Need to store number of session in the array

export const fetchControllerIntervall = async (pubsub: any, nwid: string, unsubscribe: boolean) => {
  arrOfNetworks.add(nwid);
  let prev = { members: {} };

  const memberResults = async (fn: () => void) =>
    Promises.map(arrOfNetworks, async (_nwid: any) => {
      let networks = await _zt.network_detail(_nwid);

      // compare current members with previous
      if (JSON.stringify(prev.members) === JSON.stringify(networks?.members)) return fn();
      prev = { ...networks };

      // TODO not mutate
      map(networks.members, (mem: any) => {
        mem.creationTime = mem.creationTime / 1000;
      });
      await psql_updateOrCreateMembers(networks.members);

      pubsub.publish(_nwid, { members: psql_fetchMembersInNetwork(nwid) });
    }).then(() => fn());

  if (unsubscribe) {
    arrOfNetworks.delete(nwid);
    return clearTimeout(timeout);
  }

  // wait 10sec after proccess has finished. No race condition
  function recursion() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      memberResults(recursion);
    }, 10000);
  }

  memberResults(recursion);
};
