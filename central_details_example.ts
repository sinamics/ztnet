// {
//   "network": {
//     "cidr": [
//       "10.121.15.0/24",
//       "10.121.16.0/24",
//       "10.121.17.0/24",
//       "10.121.18.0/24",
//       "172.25.25.0/24",
//       "172.25.26.0/24",
//       "172.25.27.0/24",
//       "172.25.28.0/24"
//     ],
//     "nwid": "e5cd7a9e1c122ef7",
//     "type": "Network",
//     "clock": 1691078748517,
//     "description": "central description\n",
//     "rulesSource": "# Allow only IPv4, IPv4 ARP, and IPv6 Ethernet frames. Typical default\ndrop\nnot ethertype ipv4\nand not ethertype arp\nand not ethertype ipv6\n;\n# Create a capability called \"superuser\" that lets its holders override all but the initial \"drop\"\ncap superuser\n  id 1000 # arbitrary, but must be unique\n  accept; # allow with no match conditions means allow anything and everything\n;\n# Is this member a server?\ntag server\nid 2\nenum 0 No\nenum 1 Yes\ndefault Yes\n;\n# Create a tag for which department someone is in\ntag department\n  id 1000                 # arbitrary, but must be unique\n  enum 100 sales          # has no meaning to filter, but used in UI to offer a selection\n  enum 200 engineering\n  enum 300 support\n  enum 400 manufacturing\n;\n\n# if both members are not servers\nbreak\nnot tor server 1\n;\n\n# Accept anything else. This is required since default is 'drop'.\naccept;\n",
//     "permissions": {
//       "327cadab-2a2a-4c48-b592-a2ffe7883856": {
//         "a": true,
//         "d": true,
//         "m": true,
//         "r": true
//       }
//     },
//     "ownerId": "327cadab-2a2a-4c48-b592-a2ffe7883856",
//     "onlineMemberCount": 1,
//     "authorizedMemberCount": 1,
//     "totalMemberCount": 1,
//     "capabilitiesByName": {
//       "superuser": 1000
//     },
//     "tagsByName": {
//       "department": {
//         "default": null,
//         "enums": {
//           "engineering": 200,
//           "manufacturing": 400,
//           "sales": 100,
//           "support": 300
//         },
//         "flags": {},
//         "id": 1000
//       },
//       "server": {
//         "default": 0,
//         "enums": {
//           "no": 0,
//           "yes": 1
//         },
//         "flags": {},
//         "id": 2
//       }
//     },
//     "ui": {
//       "membersHelpCollapsed": true,
//       "rulesHelpCollapsed": true,
//       "settingsHelpCollapsed": true,
//       "v4EasyMode": true
//     },
//     "authTokens": null,
//     "creationTime": 1689164970409,
//     "capabilities": [
//       {
//         "default": false,
//         "id": 1000,
//         "rules": [
//           {
//             "type": "ACTION_ACCEPT"
//           }
//         ]
//       }
//     ],
//     "enableBroadcast": false,
//     "id": "e5cd7a9e1c122ef7",
//     "ipAssignmentPools": [
//       {
//         "ipRangeStart": "10.147.17.1",
//         "ipRangeEnd": "10.147.17.254"
//       }
//     ],
//     "lastModified": 1690921432341,
//     "mtu": 2800,
//     "multicastLimit": 32,
//     "name": "high_kadstdsff",
//     "private": true,
//     "remoteTraceLevel": 0,
//     "remoteTraceTarget": null,
//     "routes": [
//       {
//         "target": "10.147.17.0/24"
//       }
//     ],
//     "rules": [
//       {
//         "etherType": 2048,
//         "not": true,
//         "or": false,
//         "type": "MATCH_ETHERTYPE"
//       },
//       {
//         "etherType": 2054,
//         "not": true,
//         "or": false,
//         "type": "MATCH_ETHERTYPE"
//       },
//       {
//         "etherType": 34525,
//         "not": true,
//         "or": false,
//         "type": "MATCH_ETHERTYPE"
//       },
//       {
//         "type": "ACTION_DROP"
//       },
//       {
//         "id": 2,
//         "not": true,
//         "or": false,
//         "type": "MATCH_TAGS_BITWISE_OR",
//         "value": 1
//       },
//       {
//         "type": "ACTION_BREAK"
//       },
//       {
//         "type": "ACTION_ACCEPT"
//       }
//     ],
//     "tags": [
//       {
//         "default": 0,
//         "id": 2
//       },
//       {
//         "default": null,
//         "id": 1000
//       }
//     ],
//     "v4AssignMode": {
//       "zt": true
//     },
//     "v6AssignMode": {
//       "6plane": false,
//       "rfc4193": false,
//       "zt": false
//     },
//     "dns": {
//       "domain": "home.com",
//       "servers": []
//     },
//     "ssoConfig": {
//       "enabled": false,
//       "mode": ""
//     }
//   },
//   "members": [
//     {
//       "id": "e5cd7a9e1c122ef7-efcc1b0947",
//       "type": "Member",
//       "clock": 1691078748727,
//       "networkId": "e5cd7a9e1c122ef7",
//       "nodeId": "efcc1b0947",
//       "controllerId": "e5cd7a9e1c",
//       "hidden": false,
//       "name": "bc",
//       "description": "",
//       "config": {
//         "activeBridge": false,
//         "address": "efcc1b0947",
//         "authorized": true,
//         "capabilities": [1000],
//         "creationTime": 1689164995720,
//         "id": "efcc1b0947",
//         "identity": "efcc1b0947:0:0152e4bbdf517c0218ff096db3195f65b7f66cb544d6506cb13fe01f9851212652f2cabe6133bd0e83e0c2930c7db23a2e14574782256e94e831711d04c48979",
//         "ipAssignments": ["10.147.17.31"],
//         "lastAuthorizedTime": 1689714787234,
//         "lastDeauthorizedTime": 1689714786494,
//         "noAutoAssignIps": false,
//         "nwid": "e5cd7a9e1c122ef7",
//         "objtype": "member",
//         "remoteTraceLevel": 0,
//         "remoteTraceTarget": "NULL      ",
//         "revision": 67,
//         "tags": [
//           [2, 1],
//           [1000, 400]
//         ],
//         "vMajor": 1,
//         "vMinor": 10,
//         "vRev": 2,
//         "vProto": 12,
//         "ssoExempt": false
//       },
//       "lastOnline": 1691078701874,
//       "lastSeen": 1691078701874,
//       "physicalAddress": "88.90.77.122",
//       "physicalLocation": null,
//       "clientVersion": "1.10.2",
//       "protocolVersion": 12,
//       "supportsRulesEngine": true
//     }
//   ]
// },

// NOT FLATTENED
// {
//   "id": "83048a0632c0443d",
//   "type": "Network",
//   "clock": 1691129592607,
//   "config": {
//     "authTokens": null,
//     "creationTime": 1609407652789,
//     "capabilities": [],
//     "enableBroadcast": true,
//     "id": "83048a0632c0443d",
//     "ipAssignmentPools": [
//       {
//         "ipRangeStart": "192.168.195.1",
//         "ipRangeEnd": "192.168.195.254"
//       }
//     ],
//     "lastModified": 1691088265669,
//     "mtu": 2800,
//     "multicastLimit": 32,
//     "name": "Lillesand Pukk Gateway",
//     "private": true,
//     "remoteTraceLevel": 0,
//     "remoteTraceTarget": null,
//     "routes": [
//       {
//         "target": "10.0.0.0/23",
//         "via": "192.168.195.64"
//       },
//       {
//         "target": "192.168.195.0/24"
//       }
//     ],
//     "rules": [
//       {
//         "etherType": 2048,
//         "not": true,
//         "or": false,
//         "type": "MATCH_ETHERTYPE"
//       },
//       {
//         "etherType": 2054,
//         "not": true,
//         "or": false,
//         "type": "MATCH_ETHERTYPE"
//       },
//       {
//         "etherType": 34525,
//         "not": true,
//         "or": false,
//         "type": "MATCH_ETHERTYPE"
//       },
//       {
//         "type": "ACTION_DROP"
//       },
//       {
//         "type": "ACTION_ACCEPT"
//       }
//     ],
//     "tags": [],
//     "v4AssignMode": {
//       "zt": true
//     },
//     "v6AssignMode": {
//       "6plane": false,
//       "rfc4193": false,
//       "zt": false
//     },
//     "dns": {
//       "domain": "",
//       "servers": null
//     },
//     "ssoConfig": {
//       "enabled": false,
//       "mode": "standard"
//     }
//   },
//   "description": "Lillesand pukk",
//   "rulesSource": "#\n# This is a default rule set that allows IPv4 and IPv6 traffic but otherwise\n# behaves like a standard Ethernet switch.\n#\n# Please keep in mind that ZeroTier versions prior to 1.2.0 do NOT support advanced\n# network rules.\n#\n# Since both senders and receivers enforce rules, you will get the following\n# behavior in a network with both old and new versions:\n#\n# (old: 1.1.14 and older, new: 1.2.0 and newer)\n#\n# old <--> old: No rules are honored.\n# old <--> new: Rules work but are only enforced by new side. Tags will NOT work, and\n#               capabilities will only work if assigned to the new side.\n# new <--> new: Full rules engine support including tags and capabilities.\n#\n# We recommend upgrading all your devices to 1.2.0 as soon as convenient. Version\n# 1.2.0 also includes a significantly improved software update mechanism that is\n# turned on by default on Mac and Windows. (Linux and mobile are typically kept up\n# to date using package/app management.)\n#\n\n#\n# Allow only IPv4, IPv4 ARP, and IPv6 Ethernet frames.\n#\ndrop\n\tnot ethertype ipv4\n\tand not ethertype arp\n\tand not ethertype ipv6\n;\n\n#\n# Uncomment to drop non-ZeroTier issued and managed IP addresses.\n#\n# This prevents IP spoofing but also blocks manual IP management at the OS level and\n# bridging unless special rules to exempt certain hosts or traffic are added before\n# this rule.\n#\n#drop\n#\tnot chr ipauth\n#;\n\n# Accept anything else. This is required since default is 'drop'.\naccept;\n",
//   "permissions": null,
//   "ownerId": "327cadab-2a2a-4c48-b592-a2ffe7883856",
//   "onlineMemberCount": 0,
//   "authorizedMemberCount": 3,
//   "totalMemberCount": 5,
//   "capabilitiesByName": {},
//   "tagsByName": {},
//   "ui": null
// },
