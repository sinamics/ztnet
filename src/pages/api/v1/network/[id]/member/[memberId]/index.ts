import { network_members } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredPrivateApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

// Schema for updateable fields
const updateableFieldsSchema = z.object({
	name: z.object({
		type: z.literal("string"),
		destinations: z.array(z.literal("database")),
	}),
	authorized: z.object({
		type: z.literal("boolean"),
		destinations: z.array(z.literal("controller")),
	}),
});

// Schema for the request body
const updateMemberBodySchema = z.record(z.union([z.string(), z.boolean()]));

// Schema for the context passed to the handler
const handlerContextSchema = z.object({
	body: updateMemberBodySchema,
	userId: z.string(),
	networkId: z.string(),
	memberId: z.string(),
	ctx: z.object({
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});

// Function to parse and validate fields based on the expected type
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const parseField = (key: string, value: any, expectedType: string) => {
	if (expectedType === "string") {
		return value; // Assume all strings are valid
	}
	if (expectedType === "boolean") {
		if (value === "true" || value === "false") {
			return value === "true";
		}
		throw new Error(`Field '${key}' expected to be boolean, got: ${value}`);
	}
};

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

		if (Object.keys(body).length === 0) {
			return res.status(400).json({ error: "No data provided for update" });
		}

		const updateableFields = updateableFieldsSchema.parse({
			name: { type: "string", destinations: ["database"] },
			authorized: { type: "boolean", destinations: ["controller"] },
		});

		const databasePayload: Partial<network_members> = {};
		const controllerPayload: Partial<network_members> = {};

		// Iterate over keys in the request body
		for (const key in body) {
			// Check if the key is not in updateableFields
			if (!(key in updateableFields)) {
				return res.status(400).json({ error: `Invalid field: ${key}` });
			}

			try {
				const parsedValue = parseField(key, body[key], updateableFields[key].type);
				if (updateableFields[key].destinations.includes("database")) {
					databasePayload[key] = parsedValue;
				}
				if (updateableFields[key].destinations.includes("controller")) {
					controllerPayload[key] = parsedValue;
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
										nwid: networkId, // this should be the value of `nwid` you are looking for
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

// Schema for the context passed to the DELETE handler
const deleteHandlerContextSchema = z.object({
	userId: z.string(),
	networkId: z.string(),
	memberId: z.string(),
	ctx: z.object({
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});

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
