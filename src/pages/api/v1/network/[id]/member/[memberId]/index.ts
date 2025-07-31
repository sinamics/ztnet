import { network_members } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredPrivateApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";
import {
	deleteHandlerContextSchema,
	handlerContextSchema,
	updateableFieldsMetaSchema,
} from "./_schema";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

export default async function apiNetworkUpdateMembersHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "UPDATE_USER_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "POST":
			await POST_updateNetworkMember(req, res);
			break;
		case "DELETE":
			await DELETE_deleteNetworkMember(req, res);
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
const POST_updateNetworkMember = SecuredPrivateApiRoute(
	{
		requireNetworkId: true,
		requireMemberId: true,
	},
	async (_req, res, context) => {
		const validatedContext = handlerContextSchema.parse(context);
		const { body, userId, networkId, memberId, ctx } = validatedContext;

		// Validate the input data
		const validatedInput = updateableFieldsMetaSchema.parse(body);

		const updateableFields = {
			name: { type: "string", destinations: ["controller"] },
			description: { type: "string", destinations: ["database"] },
			authorized: { type: "boolean", destinations: ["controller"] },
		};

		if (Object.keys(body).length === 0) {
			return res.status(400).json({ error: "No data provided for update" });
		}

		const databasePayload: Partial<network_members> = {};
		const controllerPayload: Partial<network_members> = {};

		// Iterate over keys in the request body
		for (const [key, value] of Object.entries(validatedInput)) {
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

		try {
			// make sure the member is valid
			const network = await prisma.network.findUnique({
				where: { nwid: networkId, authorId: userId },
				include: {
					networkMembers: {
						where: { id: memberId },
					},
				},
			});

			const dbMember = network?.networkMembers?.[0];

			if (dbMember && Object.keys(databasePayload).length > 0) {
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

			// Fetch the latest data from both database and controller
			const [updatedDbMember, controllerMember] = await Promise.all([
				ctx.prisma.network_members.findUnique({
					where: {
						id_nwid: {
							id: memberId,
							nwid: networkId,
						},
					},
				}),
				// @ts-expect-error
				ztController.member_details(ctx, networkId, memberId, false),
			]);
			if (!controllerMember) {
				return res.status(404).json({ error: "Member not found in controller" });
			}

			// Merge the database and controller data
			const mergedMember = {
				...updatedDbMember,
				...controllerMember,
			};

			return res.status(200).json(mergedMember);
		} catch (cause) {
			console.error(cause);
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
const DELETE_deleteNetworkMember = SecuredPrivateApiRoute(
	{
		requireNetworkId: true,
		requireMemberId: true,
	},
	async (_req, res, context) => {
		const validatedContext = deleteHandlerContextSchema.parse(context);
		const { userId, networkId, memberId, ctx } = validatedContext;

		try {
			// make sure the member is valid
			const network = await prisma.network.findUnique({
				where: { nwid: networkId, authorId: userId },
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

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const networkAndMembers = await caller.networkMember.stash({
				nwid: networkId,
				id: memberId,
			});

			return res.status(200).json(networkAndMembers);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
