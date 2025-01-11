import { Role, type network_members } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";
import * as ztController from "~/utils/ztApi";
import { HandlerContextSchema, PostBodySchema } from "./_schema";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

export const REQUEST_PR_MINUTE = 50;

export default async function apiNetworkUpdateMembersHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_MEMBERID_CACHE_TOKEN"); // 10 requests per minute
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

			// make sure the member is valid
			const network = await prisma.network.findUnique({
				where: { nwid: networkId, organizationId: orgId },
				include: {
					networkMembers: {
						where: { id: memberId },
					},
				},
			});

			if (!network?.networkMembers || network.networkMembers.length === 0) {
				return res
					.status(401)
					.json({ error: "Member or Network not found or access denied." });
			}

			if (Object.keys(databasePayload).length > 0) {
				// if users click the re-generate icon on IP address
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

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const networkAndMembers = await caller.networkMember.getMemberById({
				nwid: networkId,
				id: memberId,
			});

			return res.status(200).json(networkAndMembers);
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
	{ requiredRole: Role.USER, requireNetworkId: true },
	async (_req, res, context) => {
		try {
			const validatedContext = HandlerContextSchema.parse(context);
			const { networkId, memberId, ctx } = validatedContext;

			const controllerMember = await ztController.ZTApiGetNetworkInfo(
				// @ts-expect-error: fake request object
				ctx,
				networkId,
				false,
			);

			const findControllermemberById = controllerMember.members.find(
				(member) => member.id === memberId,
			);
			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const networkAndMembers = await caller.networkMember.getMemberById({
				nwid: networkId,
				id: memberId,
			});

			return res.status(200).json({ ...networkAndMembers, ...findControllermemberById });
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
