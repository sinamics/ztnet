import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { IPv4gen, getNetworkClassCIDR } from "~/utils/IPv4gen";
import * as ztController from "~/utils/ztApi";
import RuleCompiler from "~/utils/rule-compiler";
import { sortIP } from "~/utils/sorting";
import { throwError, type APIError } from "~/server/helpers/errorHandler";
import { sendMailWithTemplate } from "~/utils/mail";
import type { TagsByName, NetworkEntity, RoutesEntity } from "~/types/local/network";
import type { MemberEntity, CapabilitiesByName } from "~/types/local/member";
import type { CentralNetwork } from "~/types/central/network";
import { checkNetworkAccess } from "~/utils/networkAccess";
import { type network, type network_members, Role } from "@prisma/client";
import {
	HookType,
	type NetworkConfigChanged,
	type NetworkDeleted,
} from "~/types/webhooks";
import { sendWebhook } from "~/utils/webhook";
import {
	attachLiveStatus,
	reconcileNetworkMembersOnce,
	triggerBackgroundReconcile,
} from "../services/memberService";
import { isValidCIDR, isValidDns, isValidIP } from "../utils/ipUtils";
import { networkProvisioningFactory } from "../services/networkService";
import { Address4, Address6 } from "ip-address";
import { MailTemplateKey } from "~/utils/enums";
import { syncNetworkRoutes } from "../services/routesService";

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
				.refine((val) => !val || val === "lan" || isValidIP(val), {
					message: "Via IP must be a valid IP address!",
				}),
			z.null(),
		])
		.optional(),
});

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

			// Define the interface for member counts
			interface MemberCounts {
				authorized: number;
				total: number;
				display: string;
			}

			interface NetworkWithMemberCount extends network {
				memberCounts: MemberCounts;
				networkMembers: network_members[];
			}

			const rawNetworks = (await ctx.prisma.network.findMany({
				where: {
					authorId: ctx.session.user.id,
				},
				include: {
					networkMembers: {
						select: {
							id: true,
							deleted: true,
							authorized: true,
						},
					},
				},
			})) as unknown as Omit<NetworkWithMemberCount, "memberCounts">[];

			// Process all networks and calculate member counts
			const networks: NetworkWithMemberCount[] = rawNetworks.map((network) => {
				// Only count truly active members (not deleted and not permanently deleted)
				const activeMembersFilter = (m: network_members) =>
					!m.deleted && !m.permanentlyDeleted;

				// Count authorized active members
				const authorizedCount = network.networkMembers.filter(
					(m) => m.authorized && activeMembersFilter(m),
				).length;

				// Count total active members
				const totalCount = network.networkMembers.filter(activeMembersFilter).length;

				return {
					...network,
					memberCounts: {
						authorized: authorizedCount,
						total: totalCount,
						display: `${authorizedCount} (${totalCount})`,
					},
				};
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
				// Keep getNetworkById's shape uniform: meta + counts (members are served
				// by getNetworkMembers). Central has no DB-backed zombie members.
				const centralResponse = await ztController.central_network_and_members(
					ctx,
					input.nwid,
					input.central,
				);
				const centralMembers = (centralResponse?.members ?? []) as MemberEntity[];
				return {
					network: centralResponse?.network,
					memberCount: centralMembers.length,
					authorizedMemberCount: centralMembers.filter((m) => m.authorized).length,
					zombieMembers: [] as network_members[],
				};
			}

			try {
				// First, retrieve the network with organization details
				const networkFromDatabase = await ctx.prisma.network.findUnique({
					where: {
						nwid: input.nwid,
					},
					include: {
						organization: true,
						routes: true,
					},
				});

				if (!networkFromDatabase) {
					return throwError("Network not found!");
				}

				// Check if the user is the author of the network or part of the associated organization
				const isAuthor = networkFromDatabase.authorId === ctx.session.user.id;
				const isMemberOfOrganization =
					networkFromDatabase.organizationId &&
					(await ctx.prisma.organization.findFirst({
						where: {
							id: networkFromDatabase.organizationId,
							users: {
								some: { id: ctx.session.user.id },
							},
						},
					}));

				if (!isAuthor && !isMemberOfOrganization) {
					return throwError("You do not have access to this network!");
				}

				/**
				 * Network details from the controller (metadata + routes only — members
				 * are reconciled separately to avoid an N+1 per-member fetch).
				 */
				const controllerNetwork = await ztController
					.get_network(ctx, networkFromDatabase.nwid)
					.catch((err: APIError) => {
						throwError(`${err.message}`);
					});

				if (!controllerNetwork) return throwError("Failed to get network details!");

				// Members are served (paginated) by getNetworkMembers. Here we just kick
				// off a deduped reconcile — awaiting it only on a cold cache so the page's
				// counts aren't empty on first load — then derive lightweight counts and
				// the stashed (zombie) list straight from the DB.
				const cachedCount = await ctx.prisma.network_members.count({
					where: { nwid: input.nwid },
				});
				if (cachedCount === 0) {
					await reconcileNetworkMembersOnce(ctx, input.nwid).catch((err) => {
						console.error("Initial reconcile failed:", err);
					});
				} else {
					triggerBackgroundReconcile(ctx, input.nwid);
				}

				// Generate CIDR options for IP configuration
				const { cidrOptions } = IPv4gen(null, []);

				const [zombieMembers, memberCount, authorizedMemberCount] = await Promise.all([
					ctx.prisma.network_members.findMany({
						where: { nwid: input.nwid, deleted: true, permanentlyDeleted: false },
					}),
					ctx.prisma.network_members.count({
						where: { nwid: input.nwid, deleted: false },
					}),
					ctx.prisma.network_members.count({
						where: { nwid: input.nwid, deleted: false, authorized: true },
					}),
				]);

				// if the networkFromDatabase.routes is not equal to the ztControllerResponse.routes, update the networkFromDatabase.routes
				// Only sync if routes actually differ to avoid unnecessary database operations
				const dbRouteKeys = new Set(
					networkFromDatabase.routes?.map((r) => `${r.target}|${r.via || "null"}`) || [],
				);
				const ztRouteKeys = new Set(
					controllerNetwork.routes?.map((r) => `${r.target}|${r.via || "null"}`) || [],
				);
				// A smaller key-set than the raw row count means duplicate rows exist in
				// the DB; those must be reconciled away even if the deduped sets match.
				const dbHasDuplicateRoutes =
					(networkFromDatabase.routes?.length || 0) !== dbRouteKeys.size;
				const routesAreDifferent =
					dbHasDuplicateRoutes ||
					dbRouteKeys.size !== ztRouteKeys.size ||
					![...dbRouteKeys].every((key) => ztRouteKeys.has(key));

				if (routesAreDifferent) {
					const syncedNetwork = await syncNetworkRoutes({
						networkId: input.nwid,
						networkFromDatabase,
						ztControllerRoutes: controllerNetwork.routes,
					});
					// Reflect the synced routes in the response so the UI is correct on
					// this same request instead of only after a manual refresh.
					if (syncedNetwork?.routes) {
						networkFromDatabase.routes =
							syncedNetwork.routes as typeof networkFromDatabase.routes;
					}
				}

				// check if there is other network using same routes and return a notification
				const targetIPs = controllerNetwork.routes.map((route) => route.target);
				interface DuplicateRoutes {
					authorId: string;
					routes: RoutesEntity[];
					name: string;
				}

				// check if there are any other networks with the same routes.
				let duplicateRoutes: DuplicateRoutes[] = [];

				// Disabled duplicates for organization networks for now. Not sure it's needed.
				if (targetIPs.length > 0 && !isMemberOfOrganization) {
					duplicateRoutes = await ctx.prisma.$queryRaw<DuplicateRoutes[]>`
					SELECT 
						n."authorId",
						n."name",
						n."nwid",
						array_agg(
							json_build_object(
								'id', r."id",
								'target', r."target",
								'via', r."via"
							)
						) as routes
					FROM "network" n
					INNER JOIN "Routes" r ON r."networkId" = n."nwid"
					WHERE n."authorId" = ${ctx.session.user.id}
						AND n."organizationId" IS NULL
						AND r."target" = ANY(${targetIPs}::text[])
						AND n."nwid" != ${input.nwid}
					GROUP BY n."authorId", n."name", n."nwid"
				`;
				}

				// Extract duplicated IPs
				const duplicatedIPs = duplicateRoutes.flatMap((network) =>
					network.routes
						.filter((route) => targetIPs.includes(route.target))
						.map((route) => route.target),
				);

				// Remove duplicates from the list of duplicated IPs
				const uniqueDuplicatedIPs = [...new Set(duplicatedIPs)];

				// Construct the final response object using the already fetched network data
				return {
					network: {
						...controllerNetwork,
						...networkFromDatabase,
						cidr: cidrOptions,
						duplicateRoutes: duplicateRoutes.map((network) => ({
							...network,
							duplicatedIPs: uniqueDuplicatedIPs,
						})),
					},
					memberCount,
					authorizedMemberCount,
					zombieMembers,
				};
			} catch (error) {
				console.error("Error in getNetworkById:", error);
				// Re-throw to maintain API contract
				throw error;
			}
		}),
	/**
	 * Paginated, DB-first member list for a network. Serves a page straight from
	 * the database (fast, scales to thousands of members) enriched with live
	 * connection status, and triggers a background controller reconcile to keep
	 * the cache fresh. On a cold cache (no rows yet) it reconciles synchronously
	 * so the first load isn't empty.
	 */
	getNetworkMembers: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().optional().default(false),
				page: z.number().int().min(0).default(0),
				// High cap so "list all members" callers (REST collection endpoint,
				// routes name-resolution) can request the full set in one page.
				pageSize: z.number().int().min(1).max(100000).default(50),
				search: z.string().trim().optional(),
				sortBy: z
					.enum([
						"id",
						"name",
						"authorized",
						"online",
						"physicalAddress",
						"ipAssignments",
						"lastSeen",
						"creationTime",
					])
					.default("id"),
				sortDir: z.enum(["asc", "desc"]).default("asc"),
			}),
		)
		.query(async ({ ctx, input }) => {
			await checkNetworkAccess(ctx, input.nwid, Role.READ_ONLY);

			// Central networks are hosted by ZeroTier; keep the existing fetch and
			// paginate in memory (the local-controller N+1 is the issue we target).
			if (input.central) {
				const response = await ztController.central_network_and_members(
					ctx,
					input.nwid,
					true,
				);
				const all = (response?.members ?? []) as MemberEntity[];
				const start = input.page * input.pageSize;
				return {
					members: all.slice(start, start + input.pageSize),
					totalCount: all.length,
					authorizedCount: all.filter((m) => m.authorized).length,
				};
			}

			// Cold cache: populate synchronously so the first load isn't empty.
			// Otherwise serve the DB and refresh in the background.
			const cachedCount = await ctx.prisma.network_members.count({
				where: { nwid: input.nwid },
			});
			if (cachedCount === 0) {
				await reconcileNetworkMembersOnce(ctx, input.nwid).catch((err) => {
					console.error("Initial reconcile failed:", err);
				});
			} else {
				triggerBackgroundReconcile(ctx, input.nwid);
			}

			const search = input.search;
			const where = {
				nwid: input.nwid,
				deleted: false,
				...(search
					? {
							OR: [
								{ id: { contains: search, mode: "insensitive" as const } },
								{ name: { contains: search, mode: "insensitive" as const } },
								{
									physicalAddress: { contains: search, mode: "insensitive" as const },
								},
								{ ipAssignments: { has: search } },
							],
						}
					: {}),
			};

			const skip = input.page * input.pageSize;
			const include = { notations: { include: { label: true } } } as const;

			let rows: Awaited<
				ReturnType<
					typeof ctx.prisma.network_members.findMany<{ include: typeof include }>
				>
			>;
			if (input.sortBy === "ipAssignments") {
				// Prisma can't ORDER BY an array column, so sort by the first IP
				// numerically here, reusing the original `sortIP` logic so the order
				// matches the pre-refactor table exactly (IPv4/IPv6 aware). IP sort is
				// user-initiated and only pulls a tiny {id, ipAssignments} projection.
				const ipKey = (ips: string[] | null | undefined): bigint =>
					ips?.length ? sortIP(ips[0].split("/")[0]) : BigInt(0);
				const keyed = await ctx.prisma.network_members.findMany({
					where,
					select: { id: true, ipAssignments: true },
				});
				keyed.sort((a, b) => {
					const av = ipKey(a.ipAssignments);
					const bv = ipKey(b.ipAssignments);
					const cmp = av < bv ? -1 : av > bv ? 1 : 0;
					return input.sortDir === "desc" ? -cmp : cmp;
				});
				const pageIds = keyed.slice(skip, skip + input.pageSize).map((r) => r.id);
				const pageRows = await ctx.prisma.network_members.findMany({
					where: { nwid: input.nwid, id: { in: pageIds } },
					include,
				});
				const byId = new Map(pageRows.map((r) => [r.id, r]));
				rows = pageIds
					.map((id) => byId.get(id))
					.filter((r): r is (typeof pageRows)[number] => Boolean(r));
			} else {
				rows = await ctx.prisma.network_members.findMany({
					where,
					orderBy: { [input.sortBy]: input.sortDir },
					skip,
					take: input.pageSize,
					include,
				});
			}

			const [totalCount, authorizedCount] = await Promise.all([
				ctx.prisma.network_members.count({ where }),
				ctx.prisma.network_members.count({
					where: { nwid: input.nwid, deleted: false, authorized: true },
				}),
			]);

			const members = await attachLiveStatus(ctx, rows);
			return { members, totalCount, authorizedCount };
		}),
	deleteNetwork: protectedProcedure
		.input(
			z.object({
				nwid: z.string({ error: "Invalid network ID provided" }),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			try {
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
				// Log the action
				await ctx.prisma.activityLog.create({
					data: {
						action: `Deleted network ${input.nwid}`,
						performedById: ctx.session.user.id,
						organizationId: input.organizationId || null,
					},
				});
			} catch (error) {
				if (error instanceof z.ZodError) {
					return throwError(`Invalid routes provided ${error.message}`);
				}
				throw error;
			}

			// Get network name for notification before deletion
			const networkToDelete = await ctx.prisma.network.findFirst({
				where: {
					nwid: input.nwid,
					...(input.organizationId
						? { organizationId: input.organizationId }
						: { authorId: ctx.session.user.id }),
				},
				select: {
					name: true,
				},
			});

			try {
				// Send webhook
				await sendWebhook<NetworkDeleted>({
					hookType: HookType.NETWORK_DELETED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			// Send notification to organization admins if this is an organization network
			if (input.organizationId) {
				try {
					const { sendOrganizationAdminNotification } = await import(
						"~/utils/organizationNotifications"
					);
					await sendOrganizationAdminNotification({
						organizationId: input.organizationId,
						eventType: "NETWORK_DELETED",
						eventData: {
							actorEmail: ctx.session.user.email,
							actorName: ctx.session.user.name,
							networkId: input.nwid,
							networkName: networkToDelete?.name || input.nwid,
						},
					});
				} catch (_error) {
					// Don't fail the operation if notification fails
				}
			}

			return true;
		}),

	ipv6: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

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

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

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
				nwid: z.string(),
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} IPv4 auto-assign to ${input.updateParams.v4AssignMode.zt}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// if central is true, send the request to the central API and return the response
			const { v4AssignMode } = input.updateParams;
			// prepare update params
			const updateParams = input.central
				? { config: { v4AssignMode } }
				: { v4AssignMode };

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

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
					note: z.string().optional(),
					routeId: z.string().optional(),
					via: z.union([z.string(), z.null()]).optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

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

			const { note, via } = input.updateParams;

			// if note, add it to the database
			if (typeof note === "string") {
				await ctx.prisma.routes.update({
					where: {
						id: input.updateParams.routeId,
					},
					data: {
						notes: note,
					},
				});
			}

			let { routes } = input.updateParams;

			// if via is being updated, fetch current routes and update the specific route
			if (via !== undefined && input.updateParams.routeId) {
				// validate via is a valid IP or empty/null
				if (via !== null && via !== "" && !isValidIP(via)) {
					throwError("Via must be a valid IP address or empty for LAN");
				}

				const currentRoutes = await ctx.prisma.routes.findMany({
					where: { networkId: input.nwid },
				});

				routes = currentRoutes.map((route) => ({
					target: route.target,
					via:
						route.id === input.updateParams.routeId
							? via === "" || via === null
								? null
								: via
							: route.via,
				}));
			}

			// prepare update params
			const updateParams = input.central ? { config: { routes } } : { routes };

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
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
				nwid: z.string(),
				central: z.boolean().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					routes: RoutesArraySchema.optional(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} IP assignment to ${JSON.stringify(
						input.updateParams.routes,
					)})}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			// generate network params
			const { ipAssignmentPools, routes, v4AssignMode } = IPv4gen(
				input.updateParams.routes[0].target,
				[],
			);

			// prepare update params
			const updateParams = input.central
				? { config: { ipAssignmentPools, routes, v4AssignMode } }
				: { ipAssignmentPools, routes, v4AssignMode };

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
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
				nwid: z.string(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					ipAssignmentPools: z.array(
						z.object({
							ipRangeStart: z.string().trim(),
							ipRangeEnd: z.string().trim(),
						}),
					),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

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

			// Validate the IP ranges
			for (const ipRange of input.updateParams.ipAssignmentPools) {
				if (
					!(
						(Address6.isValid(ipRange.ipRangeStart) &&
							Address6.isValid(ipRange.ipRangeEnd)) ||
						(Address4.isValid(ipRange.ipRangeStart) &&
							Address4.isValid(ipRange.ipRangeEnd))
					)
				) {
					return throwError("Invalid IP range provided");
				}
			}

			const { ipAssignmentPools } = input.updateParams;

			// get routes from controller
			const controllerNetwork = await ztController.get_network(
				ctx,
				input.nwid,
				input.central,
			);

			/**
			 *  getNetworkClassCIDR: Converts IP address ranges to CIDR notations.
			 *  Accepts an array of `{ ipRangeStart, ipRangeEnd }` objects and returns an array of CIDR strings.
			 */

			const routes = getNetworkClassCIDR(
				ipAssignmentPools as { ipRangeStart: string; ipRangeEnd: string }[],
			);

			/**
			 * Combine the routes from the controller with the routes from the input.
			 */
			const combinedRoutes = [...(controllerNetwork?.routes || []), ...routes];

			/**
			 * Create a map of unique routes using the target IP as the key.
			 * This ensures that duplicate routes are not added to the network.
			 */
			const uniqueRoutesMap = new Map(
				combinedRoutes.map((route) => {
					const ip = route.target.split("/")[0];
					return [ip, route];
				}),
			);

			/**
			 * Convert the map back to an array of unique routes.
			 */
			const uniqueRoutes = Array.from(uniqueRoutesMap.values());
			const updateParams = input.central
				? {
						config: {
							ipAssignmentPools,
							routes: uniqueRoutes,
						},
					}
				: { ipAssignmentPools, routes: uniqueRoutes };

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
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
				nwid: z.string(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					private: z.boolean(),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} privacy to ${input.updateParams.private}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

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
			}

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			return updated as NetworkEntity;
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} name to ${input.updateParams.name}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

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
			}
			// Update network in prisma as description is not part of the local controller network object.
			await ctx.prisma.network.update({
				where: { nwid: input.nwid },
				data: {
					...input.updateParams,
				},
			});

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			return updated;
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} description to ${input.updateParams.description}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

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

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

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
							domain: z.string().refine(isValidDns, {
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

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

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

			// Send the request to update the network
			return await ztController.network_update({
				ctx,
				nwid: input.nwid,
				central: input.central,
				updateParams: ztControllerUpdates,
			});
		}),
	mtu: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
				central: z.boolean().optional().default(false),
				organizationId: z.string().optional(),
				updateParams: z.object({
					mtu: z.number().min(1280).max(10000),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Changed network ${input.nwid} MTU to ${JSON.stringify(
						input.updateParams,
					)}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			const updateParams = input.central
				? { config: { ...input.updateParams } }
				: { ...input.updateParams };

			try {
				await ztController.network_update({
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

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}
		}),
	multiCast: protectedProcedure
		.input(
			z.object({
				nwid: z.string(),
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

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

			const updateParams = input.central
				? { config: { ...input.updateParams } }
				: { ...input.updateParams };

			try {
				await ztController.network_update({
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

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: input.updateParams,
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
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
			return await networkProvisioningFactory(props);
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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Updated flow route for network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

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
				// biome-ignore lint/complexity/useLiteralKeys: <explanation>
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

			try {
				// Send webhook
				await sendWebhook<NetworkConfigChanged>({
					hookType: HookType.NETWORK_CONFIG_CHANGED,
					organizationId: input?.organizationId,
					userId: ctx.session.user.id,
					userEmail: ctx.session.user.email,
					networkId: input.nwid,
					changes: { rulesSource: input.updateParams.flowRoute },
				});
			} catch (error) {
				// add error messge that webhook failed
				throwError(error.message);
			}

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
				nwid: z.string(),
				central: z.boolean().default(false),
				reset: z.boolean().default(false).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.READ_ONLY);

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
				nwid: z.string(),
				email: z.string().email(),
				organizationId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Invited user ${input.email} to network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

			const { nwid, email } = input;
			try {
				await sendMailWithTemplate(MailTemplateKey.InviteUser, {
					to: email,
					templateData: {
						toEmail: email,
						fromName: ctx.session.user.name,
						nwid,
					},
				});
			} catch (error) {
				console.error("Failed to send invitation email:", error);
				throw new Error("Failed to send invitation email. Please try again later.");
			}
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
				organizationId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.USER);

			// Log the action
			await ctx.prisma.activityLog.create({
				data: {
					action: `Added annotation ${input.name} to network ${input.nwid}`,
					performedById: ctx.session.user.id,
					organizationId: input?.organizationId || null, // Use null if organizationId is not provided
				},
			});

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
			// Check if the user has permission to access this network
			await checkNetworkAccess(ctx, input.nwid, Role.READ_ONLY);

			return await ctx.prisma.notation.findMany({
				where: {
					nwid: input.nwid,
				},
			});
		}),
});
