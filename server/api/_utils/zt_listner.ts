import map from 'lodash/map';

const _zt = require('./zt');

export const fetchControllerIntervall = async (pubsub: any, nwid: string, unsubscribe: boolean) => {
  let prev = {};
  let interval: any;

  const recursion = (nwid: any) => {
    if (interval) return;

    interval = setInterval(async () => {
      let networks = await _zt.network_detail(nwid);
      console.log('cecking');
      if (JSON.stringify(prev) === JSON.stringify(networks)) return;

      prev = { ...networks };
      console.log('publish');

      // TODO not mutate
      map(networks.members, (mem: any) => {
        mem.creationTime = mem.creationTime / 1000;
      });

      pubsub.publish(nwid, networks);
      recursion(nwid);
    }, 10000);
  };
  if (unsubscribe) {
    return clearInterval(interval);
  }
  recursion(nwid);
};
