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
      const zt = await centralApi.network_detail(input.nwid);
      console.log(JSON.stringify(zt,null,2))
      return {...zt}
    }),
});

// LOCAL

// {
//   "network": {
//     "authTokens": [
//       null
//     ],
//     "authorizationEndpoint": "",
//     "capabilities": [],
//     "clientId": "",
//     "creationTime": 1690866981391,
//     "dns": [],
//     "enableBroadcast": true,
//     "id": "58682d0d935dc302",
//     "ipAssignmentPools": [
//       {
//         "ipRangeEnd": "172.25.27.254",
//         "ipRangeStart": "172.25.27.1"
//       }
//     ],
//     "mtu": 2800,
//     "multicastLimit": 32,
//     "name": "improved-salmon",
//     "nwid": "58682d0d935dc302",
//     "objtype": "network",
//     "private": true,
//     "remoteTraceLevel": 0,
//     "remoteTraceTarget": null,
//     "revision": 1,
//     "routes": [
//       {
//         "target": "172.25.27.0/24",
//         "via": null
//       }
//     ],
//     "rules": [
//       {
//         "not": false,
//         "or": false,
//         "type": "ACTION_ACCEPT"
//       }
//     ],
//     "rulesSource": "",
//     "ssoEnabled": false,
//     "tags": [],
//     "v4AssignMode": {
//       "zt": true
//     },
//     "v6AssignMode": {
//       "6plane": false,
//       "rfc4193": false,
//       "zt": false
//     }
//   },
//   "members": []
// }

// CENTRAL

// {
  // network: {
  //   id: 'e5cd7a9e1c122ef7',
  //   type: 'Network',
  //   clock: 1690866910383,
  //   config: {
  //     authTokens: null,
  //     creationTime: 1689164970409,
  //     capabilities: [Array],
  //     enableBroadcast: false,
  //     id: 'e5cd7a9e1c122ef7',
  //     ipAssignmentPools: [Array],
  //     lastModified: 0,
  //     mtu: 2800,
  //     multicastLimit: 32,
  //     name: 'high_kahn',
  //     private: true,
  //     remoteTraceLevel: 0,
  //     remoteTraceTarget: null,
  //     routes: [Array],
  //     rules: [Array],
  //     tags: [Array],
  //     v4AssignMode: [Object],
  //     v6AssignMode: [Object],
  //     dns: [Object],
  //     ssoConfig: [Object]
  //   },
//     description: '',
//     rulesSource: '# Allow only IPv4, IPv4 ARP, and IPv6 Ethernet frames. Typical default\n' +
//       'drop\n' +
//       'not ethertype ipv4\n' +
//       'and not ethertype arp\n' +
//       'and not ethertype ipv6\n' +
//       ';\n' +
//       '# Create a capability called "superuser" that lets its holders override all but the initial "drop"\n' +
//       'cap superuser\n' +
//       '  id 1000 # arbitrary, but must be unique\n' +
//       '  accept; # allow with no match conditions means allow anything and everything\n' +
//       ';\n' +
//       '# Is this member a server?\n' +
//       'tag server\n' +
//       'id 2\n' +
//       'enum 0 No\n' +
//       'enum 1 Yes\n' +
//       'default Yes\n' +
//       ';\n' +
//       '# Create a tag for which department someone is in\n' +
//       'tag department\n' +
//       '  id 1000                 # arbitrary, but must be unique\n' +
//       '  enum 100 sales          # has no meaning to filter, but used in UI to offer a selection\n' +
//       '  enum 200 engineering\n' +
//       '  enum 300 support\n' +
//       '  enum 400 manufacturing\n' +
//       ';\n' +
//       '\n' +
//       '# if both members are not servers\n' +
//       'break\n' +
//       'not tor server 1\n' +
//       ';\n' +
//       '\n' +
//       "# Accept anything else. This is required since default is 'drop'.\n" +
//       'accept;\n',
//     permissions: { '327cadab-2a2a-4c48-b592-a2ffe7883856': [Object] },
//     ownerId: '327cadab-2a2a-4c48-b592-a2ffe7883856',
//     onlineMemberCount: 0,
//     authorizedMemberCount: 1,
//     totalMemberCount: 1,
//     capabilitiesByName: { superuser: 1000 },
//     tagsByName: { department: [Object], server: [Object] },
//     ui: {
//       membersHelpCollapsed: true,
//       rulesHelpCollapsed: true,
//       settingsHelpCollapsed: true,
//       v4EasyMode: true
//     }
//   },
//   members: [
//     {
//       id: 'e5cd7a9e1c122ef7-efcc1b0947',
//       type: 'Member',
//       clock: 1690866910635,
//       networkId: 'e5cd7a9e1c122ef7',
//       nodeId: 'efcc1b0947',
//       controllerId: 'e5cd7a9e1c',
//       hidden: false,
//       name: 'bc',
//       description: '',
//       config: [Object],
//       lastOnline: 1689845193543,
//       lastSeen: 1689845193543,
//       physicalAddress: '88.90.77.122',
//       physicalLocation: null,
//       clientVersion: '1.10.2',
//       protocolVersion: 12,
//       supportsRulesEngine: true
//     }
//   ]
// }