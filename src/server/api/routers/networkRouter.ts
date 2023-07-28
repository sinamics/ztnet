import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import {
  type Config,
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import * as ztController from "~/utils/ztApi";
import { handleAutoAssignIP, updateNetworkMembers } from "../networkService";
import { Address4, Address6 } from "ip-address";
import {
  type NetworkAndMembers,
  type MembersEntity,
  type ZtControllerNetwork,
  type IpAssignmentPoolsEntity,
  type Peers,
  type NetworkEntity,
  type Paths,
  type CapabilitiesByName,
  type TagsByName,
} from "~/types/network";
import RuleCompiler from "~/utils/rule-compiler";
import { throwError, type APIError } from "~/server/helpers/errorHandler";
import { type network_members } from "@prisma/client";
import { createTransporter, inviteUserTemplate, sendEmail } from "~/utils/mail";
import ejs from "ejs";

const customConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: "-",
  length: 2,
};

function isValidIP(ip: string): boolean {
  return Address4.isValid(ip) || Address6.isValid(ip);
}
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}
const RouteSchema = z.object({
  target: z
    .string()
    .optional()
    .refine((val) => val !== undefined && isValidCIDR(val), {
      message: "Destination IP must be a valid CIDR notation!",
    }),
  via: z
    .union([
      z
        .string()
        .optional()
        .refine((val) => !val || isValidIP(val), {
          message: "Via IP must be a valid IP address!",
        }),
      z.null(),
    ])
    .optional(),
});

function isValidCIDR(cidr: string): boolean {
  const [ip, prefix] = cidr.split("/");
  const isIPv4 = isValidIP(ip);
  const isIPv6 = isValidIP(ip);
  const prefixNumber = parseInt(prefix);

  if (isIPv4) {
    return prefixNumber >= 0 && prefixNumber <= 32;
  } else if (isIPv6) {
    return prefixNumber >= 0 && prefixNumber <= 128;
  } else {
    return false;
  }
}
const RoutesArraySchema = z.array(RouteSchema);

export const networkRouter = createTRPCRouter({
  getUserNetworks: protectedProcedure.query(async ({ ctx }) => {
    const networks = await ctx.prisma.network.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
      include: {
        network_members: {
          select: {
            id: true,
          },
        },
      },
    });
    return networks;
  }),

  getNetworkById: protectedProcedure
    .input(z.object({ nwid: z.string() }))
    .query(async ({ ctx, input }) => {
      const psqlNetworkData = await ctx.prisma.network.findFirst({
        where: {
          AND: [
            {
              authorId: { equals: ctx.session.user.id },
              nwid: { equals: input.nwid },
            },
          ],
        },
        include: {
          network_members: false,
          // notations: true,
        },
      });

      // Only return nw details for author user!
      if (!psqlNetworkData)
        return throwError(`You are not the Author of this network!`);

      // Return nw obj details
      const ztControllerResponse = await ztController
        .network_detail(psqlNetworkData.nwid)
        .catch((err: APIError) => {
          return throwError(`${err.message}`);
        });

      // console.log(JSON.stringify(ztControllerResponse, null, 2));

      // console.log(JSON.stringify(ztControllerResponse, null, 2));
      // upate db with new memebers if they not exsist
      await updateNetworkMembers(ztControllerResponse);

      // Get available cidr options.
      const ipAssignmentPools = IPv4gen(null);
      const { cidrOptions } = ipAssignmentPools;

      // merge network data from psql and zt controller
      const mergedNetwork = {
        ...psqlNetworkData,
        ...ztControllerResponse?.network,
        cidr: cidrOptions,
      };

      const combined: Partial<NetworkAndMembers> = {
        ...ztControllerResponse,
        network: mergedNetwork as ZtControllerNetwork,
      };
      const { members, network } = combined;

      // Get all members that is deleted but still active in controller (zombies).
      // Due to an issue were not possible to delete user.
      // Updated 08/2022, delete function should work if user is de-autorized prior to deleting.
      const getZombieMembersPromises = members.map(
        async (member: MembersEntity) => {
          return await ctx.prisma.network_members.findFirst({
            where: {
              nwid: input.nwid,
              id: member.id,
              deleted: true,
            },
          });
        }
      );

      const getActiveMembers = await ctx.prisma.network_members.findMany({
        where: {
          nwid: input.nwid,
          deleted: false,
        },
        include: {
          notations: {
            include: {
              label: true,
            },
          },
        },
      });
      // Get peers to view client version of zt
      const updatedActiveMembers = await Promise.all(
        getActiveMembers.map(async (member: network_members) => {
          const peers = (await ztController
            .peer(member.address)
            .catch(() => [])) as Peers[];

          const memberPeer = peers.find(
            (peer: Peers) => peer.address === member.id
          );
          let activePreferredPath: Paths | undefined;

          if (memberPeer && memberPeer.paths) {
            activePreferredPath = memberPeer.paths.find(
              (path) => path && path.active === true && path.preferred === true
            );
          }

          // Renamed address field of activePreferredPath
          const { address: physicalAddress, ...restOfActivePreferredPath } =
            activePreferredPath || {};

          return {
            ...member,
            peers: {
              ...(memberPeer || {}),
              physicalAddress,
              ...restOfActivePreferredPath,
            },
          };
        })
      );

      // console.log(JSON.stringify(updatedActiveMembers, null, 2));
      // Resolve the promises before passing them to Promise.all
      const zombieMembers = await Promise.all(getZombieMembersPromises);
      // console.log(JSON.stringify(updatedActiveMembers, null, 2));

      // filters out any null or undefined elements in the zombieMembers array.
      const filteredZombieMembers = zombieMembers.filter((a) => a);
      return {
        network,
        members: updatedActiveMembers,
        zombieMembers: filteredZombieMembers,
      };
    }),
  deleteNetwork: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Delete ZT network
        await ztController.network_delete(input.nwid);

        // Delete network_members
        await ctx.prisma.network_members.deleteMany({
          where: {
            nwid: input.nwid,
          },
        });

        // Delete network
        await ctx.prisma.network.deleteMany({
          where: {
            authorId: ctx.session.user.id,
            nwid: input.nwid,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return throwError(`Invalid routes provided ${error.message}`);
        } else {
          throw error;
        }
      }
    }),
  updateNetwork: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
        updateParams: z.object({
          multicast: z
            .object({
              multicastLimit: z.string().optional(),
              enableBroadcast: z.boolean().optional(),
            })
            .optional(),
          privateNetwork: z.boolean().optional(),
          ipAssignmentPools: z
            .array(
              z.object({
                ipRangeStart: z.string(),
                ipRangeEnd: z.string(),
              })
            )
            .optional(),
          ipPool: z.string().optional(),
          removeIpPool: z.string().optional(),
          name: z.string().optional(),
          removeDns: z.boolean().optional(),
          dns: z
            .object({
              domain: z.string().nonempty(),
              address: z.string().nonempty(),
            })
            .optional(),
          routes: RoutesArraySchema.optional(),
          changeCidr: z.string().optional(),
          autoAssignIp: z.boolean().optional().default(true),
          description: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Construct the API request payload using the provided updateParams
      const ztControllerUpdates: Partial<ZtControllerNetwork> = {};
      const prismaUpdates: Partial<NetworkEntity> = {};
      // Return nw obj details
      const ztControllerResponse = await ztController
        .network_detail(input.nwid)
        .catch((err: APIError) => {
          return throwError(`${err.message}`);
        });

      try {
        const {
          privateNetwork,
          ipPool,
          ipAssignmentPools,
          name,
          dns,
          removeDns,
          multicast,
          routes,
          changeCidr,
          autoAssignIp,
          description,
        } = input.updateParams;

        if (typeof privateNetwork === "boolean") {
          ztControllerUpdates.private = privateNetwork;
        }

        if (typeof removeDns === "boolean") {
          ztControllerUpdates.dns = {
            domain: "",
            servers: [],
          };
        }

        if (typeof multicast === "object") {
          ztControllerUpdates.multicastLimit = parseInt(
            multicast.multicastLimit,
            10
          );
          ztControllerUpdates.enableBroadcast = multicast.enableBroadcast;
        }

        if (typeof dns === "object") {
          if (!isValidIP(dns?.address)) {
            return throwError(`Invalid DNS address provided ${dns?.address}`);
          }

          if (!isValidDomain(dns.domain)) {
            return throwError(`Invalid DNS domain provided ${dns.domain}`);
          }

          ztControllerUpdates.dns = {
            domain: "",
            servers: [],
          };

          // Update domain
          ztControllerUpdates.dns.domain = dns.domain;

          if (Array.isArray(ztControllerResponse.network.dns.servers)) {
            ztControllerUpdates.dns.servers = [
              ...ztControllerResponse.network.dns.servers,
              dns.address,
            ] as string[];
          } else {
            ztControllerUpdates.dns.servers.push(dns.address);
          }
        }

        // If the network is set to auto-assign IP addresses, and an IP pool has been specified,
        // generate a new IP pool object using the IPv4gen function and assign it to the ztControllerUpdates.
        // If the IP pool is specified as an array, it is assigned directly to the ztControllerUpdates.
        if (ipPool && autoAssignIp) {
          if (typeof ipPool === "string") {
            Object.assign(ztControllerUpdates, IPv4gen(ipPool));
          } else if (Array.isArray(ipPool)) {
            ztControllerUpdates.ipAssignmentPools =
              ipPool as IpAssignmentPoolsEntity[];
          }

          if (ztControllerUpdates.routes.length > 0) {
            prismaUpdates.ipAssignments = ztControllerUpdates.routes[0].target;
          }
        }

        if (ipAssignmentPools) {
          if (Array.isArray(ipAssignmentPools)) {
            ztControllerUpdates.ipAssignmentPools =
              ipAssignmentPools as IpAssignmentPoolsEntity[];
          }
        }

        // Network name
        if (typeof name === "string") {
          prismaUpdates.nwname = name;
          ztControllerUpdates.name = name;
        }
        if (typeof description === "string") {
          prismaUpdates.description = description;
        }
        // Auto assign IP
        if (typeof autoAssignIp === "boolean") {
          prismaUpdates.autoAssignIp = autoAssignIp;
        }

        if (routes) {
          try {
            ztControllerUpdates.routes = RoutesArraySchema.parse(routes);
          } catch (error) {
            if (error instanceof z.ZodError) {
              throwError(`Invalid routes provided ${error.message}`);
            } else {
              throw error;
            }
          }
        }

        if (changeCidr) {
          ztControllerUpdates.cidr = IPv4gen(changeCidr).cidrOptions;
        }

        // Update network in prisma
        const prismaUpdatePromise = ctx.prisma.network.update({
          where: { nwid: input.nwid },
          data: prismaUpdates,
        });

        if (typeof autoAssignIp === "boolean") {
          await handleAutoAssignIP(
            autoAssignIp,
            ztControllerUpdates,
            ztControllerResponse,
            input.nwid
          );
        }
        const ztControllerUpdatePromise = ztController.network_update(
          input.nwid,
          ztControllerUpdates
        );

        const [, ztControllerResult] = await Promise.all([
          prismaUpdatePromise,
          ztControllerUpdatePromise,
        ]);
        return ztControllerResult;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throwError(`Something went wrong during update, ${error.message}`);
        } else {
          throw error;
        }
      }
    }),
  createNetwork: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Generate ipv4 address, cidr, start & end
      const ipAssignmentPools = IPv4gen(null);

      // Generate adjective and noun word
      const networkName: string = uniqueNamesGenerator(customConfig);

      // Create ZT network
      const newNw = await ztController.network_create(
        networkName,
        ipAssignmentPools
      );

      // Store the created network in the database
      const updatedUser = await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          network: {
            create: {
              nwname: newNw.name,
              nwid: newNw.nwid,
              ipAssignments: newNw.routes[0].target,
            },
          },
        },
        select: {
          network: true,
        },
      });

      return updatedUser;
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Log the error and throw a custom error message
        // eslint-disable-next-line no-console
        console.error(err);
        throwError("Could not create network! Please try again");
      } else {
        // Throw a generic error for unknown error types
        throwError("An unknown error occurred");
      }
    }
  }),
  setFlowRule: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
        flowRoute: z.string().nonempty(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { flowRoute } = input;

      const rules = [];
      const caps: Record<string, CapabilitiesByName> = {};
      const tags: TagsByName = {};
      // try {
      const err = RuleCompiler(flowRoute, rules, caps, tags) as string[];
      if (err) {
        return throwError(
          JSON.stringify({
            error: `ERROR parsing Flow Rules at line ${err[0]} column ${err[1]}: ${err[2]}`,
            line: err[0],
          })
        );
      }
      const capsArray = [];
      const capabilitiesByName = {};
      for (const n in caps) {
        const cap = caps[n];
        capsArray.push(cap);
        capabilitiesByName[n] = cap.id;
      }

      const tagsArray = [];
      for (const n in tags) {
        const t = tags[n];
        const dfl = t["default"] as unknown;
        tagsArray.push({
          id: t.id,
          default: dfl || dfl === 0 ? dfl : null,
        });
      }
      // console.log(
      //   JSON.stringify(
      //     {
      //       config: {
      //         rules: rules,
      //         capabilities: capsArray,
      //         tags: tagsArray,
      //       },
      //       capabilitiesByName: capabilitiesByName,
      //       tagsByName: tags,
      //     },
      //     null,
      //     2
      //   )
      // );
      // update zerotier network with the new flow route
      await ztController.network_update(input.nwid, {
        rules,
        capabilities: capsArray,
        tags: tagsArray,
        capabilitiesByName: capabilitiesByName,
        tagsByName: tags,
      });

      // update network in prisma
      // update network in prisma
      const { prisma } = ctx;

      // Start a transaction
      await prisma.$transaction([
        // Update network
        prisma.network.update({
          where: { nwid: input.nwid },
          data: {
            flowRule: flowRoute,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            tagsByName: tags as any,
            capabilitiesByName,
          },
        }),
      ]);
    }),
  getFlowRule: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
        reset: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const DEFAULT_NETWORK_ROUTE_CONFIG = `#
# This is a default rule set that allows IPv4 and IPv6 traffic but otherwise
# behaves like a standard Ethernet switch.
#
# Please keep in mind that ZeroTier versions prior to 1.2.0 do NOT support advanced
# network rules.
#
# Since both senders and receivers enforce rules, you will get the following
# behavior in a network with both old and new versions:
#
# (old: 1.1.14 and older, new: 1.2.0 and newer)
#
# old <--> old: No rules are honored.
# old <--> new: Rules work but are only enforced by new side. Tags will NOT work, and
#               capabilities will only work if assigned to the new side.
# new <--> new: Full rules engine support including tags and capabilities.
#
# We recommend upgrading all your devices to 1.2.0 as soon as convenient. Version
# 1.2.0 also includes a significantly improved software update mechanism that is
# turned on by default on Mac and Windows. (Linux and mobile are typically kept up
# to date using package/app management.)
#
#
# Allow only IPv4, IPv4 ARP, and IPv6 Ethernet frames.
#
drop
  not ethertype ipv4
  and not ethertype arp
  and not ethertype ipv6
;
#
# Uncomment to drop non-ZeroTier issued and managed IP addresses.
#
# This prevents IP spoofing but also blocks manual IP management at the OS level and
# bridging unless special rules to exempt certain hosts or traffic are added before
# this rule.
#
#drop
#	not chr ipauth
#;
# Accept anything else. This is required since default is 'drop'.
accept;`;

      const flow = await ctx.prisma.network.findFirst({
        where: { nwid: input.nwid },
      });

      if (!flow.flowRule || input.reset) {
        return DEFAULT_NETWORK_ROUTE_CONFIG;
      }

      return flow.flowRule;
    }),
  inviteUserByMail: protectedProcedure
    .input(
      z.object({
        nwid: z.string().nonempty(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { nwid, email } = input;
      const globalOptions = await ctx.prisma.globalOptions.findFirst({
        where: {
          id: 1,
        },
      });

      const defaultTemplate = inviteUserTemplate();
      const template = globalOptions?.inviteUserTemplate ?? defaultTemplate;

      const renderedTemplate = await ejs.render(
        JSON.stringify(template),
        {
          toEmail: email,
          fromName: ctx.session.user.name, // assuming locals contains a 'username'
          nwid, // assuming locals contains a 'username'
        },
        { async: true }
      );
      // create transporter
      const transporter = createTransporter(globalOptions);
      const parsedTemplate = JSON.parse(renderedTemplate) as Record<
        string,
        string
      >;

      // define mail options
      const mailOptions = {
        from: globalOptions.smtpEmail,
        to: ctx.session.user.email,
        subject: parsedTemplate.subject,
        html: parsedTemplate.body,
      };

      // send test mail to user
      await sendEmail(transporter, mailOptions);
    }),
  addAnotation: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        nwid: z.string(),
        nodeid: z.number(),
        color: z.string().optional(),
        description: z.string().optional(),
        showMarkerInTable: z.boolean().optional(),
        useAsTableBackground: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notation = await ctx.prisma.notation.upsert({
        where: {
          name_nwid: {
            name: input.name,
            nwid: input.nwid,
          },
        },
        update: {},
        create: {
          name: input.name,
          color: input.color,
          description: input.description,
          nwid: input.nwid,
        },
      });

      // link the notation to the network member.
      return await ctx.prisma.networkMemberNotation.upsert({
        where: {
          notationId_nodeid: {
            notationId: notation.id,
            nodeid: input.nodeid,
          },
        },
        update: {},
        create: {
          notationId: notation.id,
          nodeid: input.nodeid,
        },
      });
    }),
  getAnotation: protectedProcedure
    .input(
      z.object({
        nwid: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.notation.findMany({
        where: {
          nwid: input.nwid,
        },
      });
    }),
});
