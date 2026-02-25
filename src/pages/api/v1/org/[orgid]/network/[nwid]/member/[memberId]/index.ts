import { Role, network_members } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import type { MemberEntity } from "~/types/local/member";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";
import * as ztController from "~/utils/ztApi";
import { HandlerContextSchema, PostBodySchema } from "./_schema";

// Rate limit using environment configuration
const limiter = rateLimit({
	interval: RATE_LIMIT_CONFIG.API_WINDOW_MS,
	uniqueTokenPerInterval: 500,
});

export default async function apiNetworkUpdateMembersHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(
			res,
			RATE_LIMIT_CONFIG.API_MAX_REQUESTS,
			"ORGANIZATION_MEMBERID_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_orgNetworkMemberById(req, res);
			break;
		case "POST":
			await POST_orgUpdateNetworkMember(req, res);
			break;
		case "DELETE":
			await DELETE_orgStashNetworkMember(req, res);
			break;
		default:
			// Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

/**
 * Handles the POST request to update network members.
 *
 * @param req - The NextApiRequest object.
 * @param res - The NextApiResponse object.
 * @returns A JSON response indicating the success or failure of the update operation.
 */
export const POST_orgUpdateNetworkMember = SecuredOrganizationApiRoute(
	{ requiredRole: Role.USER, requireNetworkId: true },
	async (_req, res, context) => {
		try {
			const validatedContext = HandlerContextSchema.parse(context);
			const { networkId, orgId, body, userId, memberId } = validatedContext;

			const validatedBody = PostBodySchema.parse(body);
			// structure of the updateableFields object:

			const updateableFields = {
				name: { type: "string", destinations: ["database"] },
				authorized: { type: "boolean", destinations: ["controller"] },
			};

			const databasePayload: Partial<network_members> = {};
			const controllerPayload: Partial<network_members> = {};

			// Iterate over keys in the request body
			for (const [key, value] of Object.entries(validatedBody)) {
				// Check if the key is not in updateableFields
				if (!(key in updateableFields)) {
					return res.status(400).json({ error: `Invalid field: ${key}` });
				}

				try {
					if (updateableFields[key].destinations.includes("database")) {
						databasePayload[key] = value;
					}
					if (updateableFields[key].destinations.includes("controller")) {
						controllerPayload[key] = value;
					}
				} catch (error) {
					return res.status(400).json({ error: error.message });
				}
			}

			// assemble the context object
			const ctx = {
				session: {
					user: {
						id: userId as string,
					},
				},
				prisma,
				wss: null,
			};

			// Check if the user is an organization admin
			await checkUserOrganizationRole({
				ctx,
				organizationId: orgId,
				minimumRequiredRole: Role.USER,
			});
			// Verify the network exists and belongs to this organization
			const network = await prisma.network.findUnique({
				where: { nwid: networkId, organizationId: orgId },
				include: {
					networkMembers: {
						where: { id: memberId },
					},
				},
			});

			if (!network) {
				return res.status(404).json({ error: "Network not found or access denied." });
			}
			const dbMember = network.networkMembers?.[0];

			if (dbMember) {
				// Member exists in DB, update if there are database fields to update
				if (Object.keys(databasePayload).length > 0) {
					await ctx.prisma.network.update({
						where: {
							nwid: networkId,
						},
						data: {
							networkMembers: {
								update: {
									where: {
										id_nwid: {
											id: memberId,
											nwid: networkId,
										},
									},
									data: {
										...databasePayload,
									},
								},
							},
						},
						select: {
							networkMembers: {
								where: {
									id: memberId,
								},
							},
						},
					});
				}
			} else {
				// Member doesn't exist in DB, create it
				await ctx.prisma.network_members.create({
					data: {
						id: memberId,
						address: memberId,
						lastSeen: new Date(),
						creationTime: new Date(),
						name: databasePayload.name as string || null,
						nwid_ref: { connect: { nwid: networkId } },
					},
				});
			}

			// Update the controller (this also creates the member on ZT if it doesn't exist)
			if (Object.keys(controllerPayload).length > 0) {
				await ztController.member_update({
					// @ts-expect-error
					ctx,
					nwid: networkId,
					memberId: memberId,
					// @ts-expect-error
					updateParams: controllerPayload,
				});
			}

			// Fetch the latest data from both database and controller
			const updatedDbMember = await ctx.prisma.network_members.findUnique({
				where: {
					id_nwid: {
						id: memberId,
						nwid: networkId,
					},
				},
			});

			let controllerMember: MemberEntity | null = null;
			try {
				controllerMember = await ztController.member_details(
					// @ts-expect-error
					ctx,
					networkId,
					memberId,
					false,
				);
			} catch {
				// Member may not exist on controller yet if only DB fields were sent
			}

			// Merge the database and controller data
			const mergedMember = {
				...updatedDbMember,
				...controllerMember,
			};

			return res.status(200).json(mergedMember);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

/**
 * Handles the HTTP DELETE request to delete a member from a network.
 *
 * @param req - The NextApiRequest object representing the incoming request.
 * @param res - The NextApiResponse object representing the outgoing response.
 * @returns A JSON response indicating the success or failure of the operation.
 */
export const DELETE_orgStashNetworkMember = SecuredOrganizationApiRoute(
	{ requiredRole: Role.USER, requireNetworkId: true },
	async (_req, res, context) => {
		try {
			const validatedContext = HandlerContextSchema.parse(context);
			const { networkId, orgId, memberId, ctx } = validatedContext;

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const networkAndMembers = await caller.networkMember.stash({
				nwid: networkId,
				id: memberId,
				organizationId: orgId,
			});

			return res.status(200).json(networkAndMembers);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

/**
 * Retrieves a network member by their ID.
 *
 * @param _req - The request object.
 * @param res - The response object.
 * @param networkId - The ID of the network.
 * @param memberId - The ID of the member.
 * @param ctx - The context object.
 * @returns The network member and associated network information.
 */
export const GET_orgNetworkMemberById = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY, requireNetworkId: true },
	async (_req, res, context) => {
		try {
			const validatedContext = HandlerContextSchema.parse(context);
			const { networkId, memberId, ctx } = validatedContext;

			// PERFORMANCE: Fetch only the single member we need, not all members
			const controllerMemberDetails = await ztController.member_details(
				// @ts-expect-error: fake request object
				ctx,
				networkId,
				memberId,
				false,
			);

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const networkAndMembers = await caller.networkMember.getMemberById({
				nwid: networkId,
				id: memberId,
			});

			return res.status(200).json({ ...networkAndMembers, ...controllerMemberDetails });
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
