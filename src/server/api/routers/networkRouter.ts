import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { IPv4gen } from "~/utils/IPv4gen";
import { type Config, adjectives, animals } from "unique-names-generator";
import * as ztController from "~/utils/ztApi";
import {
	enrichMembers,
	fetchPeersForAllMembers,
	fetchZombieMembers,
	updateNetworkMembers,
} from "../networkService";
import { Address4, Address6 } from "ip-address";

import RuleCompiler from "~/utils/rule-compiler";
import { throwError, type APIError } from "~/server/helpers/errorHandler";
import { createTransporter, inviteUserTemplate, sendEmail } from "~/utils/mail";
import ejs from "ejs";
import { type TagsByName, type NetworkEntity } from "~/types/local/network";
import { type CapabilitiesByName } from "~/types/local/member";
import { type CentralNetwork } from "~/types/central/network";
import { createNetworkService } from "../services/networkService";
import { checkUserOrganizationRole } from "~/utils/role";
import { Role } from "@prisma/client";

export const customConfig: Config = {
	dictionaries: [adjectives, animals],
	separator: "-",
	length: 2,
};

function isValidIP(ip: string): boolean {
	return Address4.isValid(ip) || Address6.isValid(ip);
}
function isValidDomain(domain: string): boolean {
	const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
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
	getUserNetworks: protectedProcedure
		.input(
			z.object({
				central: z.boolean().optional().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (input.central) {
				return await ztController.get_controller_networks(ctx, input.central);
			}
			const networks = await ctx.prisma.network.findMany({
				where: {
					authorId: ctx.session.user.id,
				},
				include: {
					networkMembers: {
						select: {
							id: true,
						},
					},
				},
			});
			return networks;
		}),

	getNetworkById: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().optional().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (input.central) {
				return await ztController.central_network_detail(ctx, input.nwid, input.central);
			}

			// First, retrieve the network with organization details
			const psqlNetworkData = await ctx.prisma.network.findUnique({
				where: {
					nwid: input.nwid,
				},
				include: {
					organization: true,
				},
			});

			if (!psqlNetworkData) {
				return throwError("Network not found!");
			}

			// Check if the user is the author of the network or part of the associated organization
			const isAuthor = psqlNetworkData.authorId === ctx.session.user.id;
			const isMemberOfOrganization =
				psqlNetworkData.organizationId &&
				(await ctx.prisma.organization.findFirst({
					where: {
						id: psqlNetworkData.organizationId,
						users: {
							some: { id: ctx.session.user.id },
						},
					},
				}));

			if (!isAuthor && !isMemberOfOrganization) {
				return throwError("You do not have access to this network!");
			}

			const ztControllerResponse = await ztController
				.local_network_detail(ctx, psqlNetworkData.nwid, false)
				.catch((err: APIError) => {
					throwError(`${err.message}`);
				});
			// console.log(JSON.stringify(ztControllerResponse, null, 2));
			if (!ztControllerResponse) return throwError("Failed to get network details!");

			const peersForAllMembers = await fetchPeersForAllMembers(
				ctx,
				ztControllerResponse.members,
			);

			// Update network members based on controller response and fetched peers data
			await updateNetworkMembers(ztControllerResponse.members, peersForAllMembers);

			// Fetch members which are marked as deleted/zombie in the database for a given network
			const zombieMembers = await fetchZombieMembers(
				input.nwid,
				ztControllerResponse.members,
			);

			// Enrich controller members with additional database information and peer data
			const controllerMembers = await enrichMembers(
				input.nwid,
				ztControllerResponse.members,
				peersForAllMembers,
			);

			// Generate CIDR options for IP configuration
			const { cidrOptions } = IPv4gen(null);

			// Merging logic to ensure that members who only exist in local database ( added manually ) are also included in the response

			// Create a map to store members by their id for efficient lookup
			const mergedMembersMap = new Map();

			// Process controllerMembers first for precedence
			for (const member of controllerMembers) {
				mergedMembersMap.set(member.id, member);
			}

			// Fetch members from the database for a given network ID where the members are not deleted
			const databaseMembers = await ctx.prisma.network_members.findMany({
				where: {
					nwid: input.nwid,
					deleted: false,
				},
			});

			// Process databaseMembers
			for (const member of databaseMembers) {
				if (!mergedMembersMap.has(member.id)) {
					mergedMembersMap.set(member.id, member);
				}
			}

			// Convert the map back to an array of merged members
			const mergedMembers = [...mergedMembersMap.values()];

			// Construct the final response object
			return {
				network: {
					...ztControllerResponse?.network,
					...psqlNetworkData,
					cidr: cidrOptions,
				},
				members: mergedMembers,
				zombieMembers,
			};
		}),
	deleteNetwork: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.MODERATOR,
				});
			}

			try {
				// Log the action
				await ctx.prisma.activityLog.create({
					data: {
						action: `Deleted network ${input.nwid}`,
						performedById: ctx.session.user.id,
						organizationId: input.organizationId || null,
					},
				});

				// De-authorize all members before deleting the network
				const members = await ztController.network_members(
					ctx,
					input.nwid,
					input.central,
				);
				for (const member in members) {
					await ztController.member_update({
						ctx,
						nwid: input.nwid,
						central: input.central,
						memberId: member,
						updateParams: { authorized: false },
					});
				}

				// Delete ZT network
				await ztController.network_delete(ctx, input.nwid, input.central);

				// If the network is not central, delete it from the organization
				if (!input.central && input.organizationId) {
					await ctx.prisma.network.deleteMany({
						where: {
							organizationId: input.organizationId,
							nwid: input.nwid,
						},
					});
				}

				// If no organizationId is provided, delete network owned by the user
				if (!input.organizationId) {
					await ctx.prisma.network.deleteMany({
						where: {
							authorId: ctx.session.user.id,
							nwid: input.nwid,
						},
					});
				}
			} catch (error) {
				if (error instanceof z.ZodError) {
					throw new Error(`Invalid routes provided: ${error.message}`);
				} else {
					throw error;
				}
			}
		}),

	ipv6: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().optional().default(false),
				v6AssignMode: z.object({
					"6plane": z.boolean().optional(),
					rfc4193: z.boolean().optional(),
					zt: z.boolean().optional(),
				}),
				organizationId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} IPv6 auto-assign to ${JSON.stringify(
						input.v6AssignMode,
					)}`,
					performedById: ctx.session.user.id,
					organizationId: input.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			const network = await ztController.get_network(ctx, input.nwid, input.central);
			// prepare update params
			const updateParams = input.central
				? {
						config: {
							v6AssignMode: {
								...network?.config?.v6AssignMode,
								...input.v6AssignMode,
							},
						},
				  }
				: { v6AssignMode: { ...network.v6AssignMode, ...input.v6AssignMode } };

			// update network
			return ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});
		}),
	enableIpv4AutoAssign: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					v4AssignMode: z.object({
						zt: z.boolean(),
					}),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} IPv4 auto-assign to ${input.updateParams.v4AssignMode.zt}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			// if central is true, send the request to the central API and return the response
			const { v4AssignMode } = input.updateParams;
			// prepare update params
			const updateParams = input.central
				? { config: { v4AssignMode } }
				: { v4AssignMode };

			// update network
			return ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});
		}),
	managedRoutes: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					routes: RoutesArraySchema.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} managed routes to ${JSON.stringify(
						input.updateParams.routes,
					)}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			const { routes } = input.updateParams;
			// prepare update params
			const updateParams = input.central ? { config: { routes } } : { routes };

			// update network
			return ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});
		}),
	easyIpAssignment: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					routes: RoutesArraySchema.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} IP assignment to ${JSON.stringify(
						input.updateParams.routes,
					)})}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			// generate network params
			const { ipAssignmentPools, routes, v4AssignMode } = IPv4gen(
				input.updateParams.routes[0].target,
			);

			// prepare update params
			const updateParams = input.central
				? { config: { ipAssignmentPools, routes, v4AssignMode } }
				: { ipAssignmentPools, routes, v4AssignMode };

			// update network
			return ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});
		}),
	advancedIpAssignment: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					ipAssignmentPools: z
						.array(
							z.object({
								ipRangeStart: z.string(),
								ipRangeEnd: z.string(),
							}),
						)
						.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} IP assignment pools to ${JSON.stringify(
						input.updateParams.ipAssignmentPools,
					)}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			const { ipAssignmentPools } = input.updateParams;
			// prepare update params
			const updateParams = input.central
				? { config: { ipAssignmentPools } }
				: { ipAssignmentPools };

			// update network
			return ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});
		}),
	privatePublicNetwork: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					private: z.boolean(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} privacy to ${input.updateParams.private}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});
			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			const updateParams = input.central
				? { config: { private: input.updateParams.private } }
				: { private: input.updateParams.private };

			// if central is true, send the request to the central API and return the response
			const updated = await ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});

			if (input.central) {
				const { id: nwid, config, ...otherProps } = updated as CentralNetwork;
				return { nwid, ...config, ...otherProps } as Partial<CentralNetwork>;
			} else {
				return updated as NetworkEntity;
			}
		}),
	networkName: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					name: z.string(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} name to ${input.updateParams.name}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input.organizationId,
					requiredRole: Role.USER,
				});
			}
			const updateParams = input.central
				? { config: { ...input.updateParams } }
				: { ...input.updateParams };

			// if central is true, send the request to the central API and return the response
			const updated = await ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});

			if (input.central) {
				const { id: nwid, config, ...otherProps } = updated as CentralNetwork;
				return { nwid, ...config, ...otherProps } as Partial<CentralNetwork>;
			} else {
				// Update network in prisma as description is not part of the local controller network object.
				await ctx.prisma.network.update({
					where: { nwid: input.nwid },
					data: {
						...input.updateParams,
					},
				});

				return updated;
			}
		}),
	networkDescription: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					description: z.string(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} description to ${input.updateParams.description}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			// if central is true, send the request to the central API and return the response
			if (input.central) {
				const updated = await ztController.network_update({
					ctx,
					nwid: input.nwid,
					central: input.central,
					updateParams: input.updateParams,
				});

				const { description } = updated as CentralNetwork;
				return {
					description,
				};
			}

			// Update network in prisma as description is not part of the local controller network object.
			const updated = await ctx.prisma.network.update({
				where: { nwid: input.nwid },
				data: {
					...input.updateParams,
				},
			});

			return {
				description: updated.description,
			};
		}),
	dns: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					clearDns: z.boolean().optional(),
					dns: z
						.object({
							domain: z.string().refine(isValidDomain, {
								message: "Invalid DNS domain provided",
							}),
							servers: z.array(
								z.string().refine(isValidIP, {
									message: "Invalid DNS server provided",
								}),
							),
						})
						.refine((dns) => dns === undefined || (dns?.domain && dns.servers), {
							message: "Both domain and servers must be provided if dns is defined",
						})
						.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} DNS to ${JSON.stringify(
						input.updateParams,
					)})}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}

			let ztControllerUpdates = {};

			// If clearDns is true, set DNS to an empty object
			if (input.updateParams?.clearDns) {
				ztControllerUpdates = { dns: { domain: "", servers: [] } };
			} else {
				ztControllerUpdates = { ...input.updateParams };
			}

			// If central is true, wrap everything inside a config object
			if (input.central) {
				ztControllerUpdates = { config: { ...ztControllerUpdates } };
			}

			// Send the request to update the network
			return await ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams: ztControllerUpdates,
			});
		}),
	multiCast: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					multicastLimit: z.number().optional(),
					enableBroadcast: z.boolean().optional(),
					// changeCidr: z.string().optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} multicast to ${JSON.stringify(
						input.updateParams,
					)}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			const updateParams = input.central
				? { config: { ...input.updateParams } }
				: { ...input.updateParams };

			try {
				return await ztController.network_update({
					ctx,
					nwid: input.nwid,
					central: input.central,
					updateParams,
				});
			} catch (error) {
				if (error instanceof z.ZodError) {
					throwError(`Something went wrong during update, ${error.message}`);
				} else {
					throw error;
				}
			}
		}),
	createNetwork: protectedProcedure
		.input(
			z.object({
				central: z.boolean().optional().default(false),
			}),
		)
		.mutation(async (props) => {
			// abstracted due to pages/api/v1/network/index.ts
			await createNetworkService(props);
		}),
	setFlowRule: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					flowRoute: z.string(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Updated flow route for network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// Check if the user has permission to update the network
			if (input?.organizationId) {
				await checkUserOrganizationRole({
					ctx,
					organizationId: input?.organizationId,
					requiredRole: Role.USER,
				});
			}
			const { flowRoute } = input.updateParams;

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
					}),
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

			const updateObj = {
				rules,
				capabilities: capsArray,
				tags: tagsArray,
			};

			const updateParams = input.central
				? {
						config: { ...updateObj },
						capabilitiesByName,
						tagsByName: tags,
						rulesSource: flowRoute,
				  }
				: {
						...updateObj,
						capabilitiesByName,
						tagsByName: tags,
						rulesSource: "#",
				  };

			// update zerotier network with the new flow route
			const updatedRules = await ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams,
			});

			if (input.central) return updatedRules;

			// update network in prisma
			const { prisma } = ctx;

			// Start a transaction
			return await prisma.$transaction([
				// Update network
				prisma.network.update({
					where: { nwid: input.nwid },
					data: {
						flowRule: flowRoute,
						//@ts-expect-error
						tagsByName: tags,
						capabilitiesByName,
					},
				}),
			]);
		}),
	getFlowRule: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				central: z.boolean().default(false),
				reset: z.boolean().default(false).optional(),
			}),
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

			if (input.central || input.reset) {
				return DEFAULT_NETWORK_ROUTE_CONFIG;
			}

			const flow = await ctx.prisma.network.findFirst({
				where: { nwid: input.nwid },
			});

			if (!flow.flowRule) {
				return DEFAULT_NETWORK_ROUTE_CONFIG;
			}

			return flow.flowRule;
		}),
	inviteUserByMail: protectedProcedure
		.input(
			z.object({
				nwid: z.string().nonempty(),
				email: z.string().email(),
			}),
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
				{ async: true },
			);
			// create transporter
			const transporter = createTransporter(globalOptions);
			const parsedTemplate = JSON.parse(renderedTemplate) as Record<string, string>;

			// define mail options
			const mailOptions = {
				from: globalOptions.smtpEmail,
				to: email,
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
			}),
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
			}),
		)
		.query(async ({ ctx, input }) => {
			return await ctx.prisma.notation.findMany({
				where: {
					nwid: input.nwid,
				},
			});
		}),
});
