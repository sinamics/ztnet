import { Role, type network } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";
import { HandlerContextSchema, NetworkUpdateSchema } from "./_schema";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

export const REQUEST_PR_MINUTE = 50;

export default async function apiNetworkByIdHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_NETWORKID_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}
	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_network(req, res);
			break;
		case "POST":
			await POST_network(req, res);
			break;
		default:
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const POST_network = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY, requireNetworkId: true },
	async (_req, res, context) => {
		try {
			const validatedContext = HandlerContextSchema.parse(context);
			const { networkId, ctx, body } = validatedContext;

			// Validate the body against the NetworkUpdateSchema
			const validatedBody = NetworkUpdateSchema.parse(body);

			const updateableFields = {
				name: { type: "string", destinations: ["controller", "database"] },
				description: { type: "string", destinations: ["database"] },
				flowRule: { type: "string", destinations: ["custom"] },
				mtu: { type: "string", destinations: ["controller"] },
				private: { type: "boolean", destinations: ["controller"] },
				dns: { type: "array", destinations: ["controller"] },
				ipAssignmentPools: { type: "array", destinations: ["controller"] },
				routes: { type: "array", destinations: ["controller"] },
				v4AssignMode: { type: "object", destinations: ["controller"] },
				v6AssignMode: { type: "object", destinations: ["controller"] },
			};

			const databasePayload: Partial<network> = {};
			const controllerPayload: Partial<network> = {};

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);

			// Iterate over keys in the request body
			for (const [key, value] of Object.entries(validatedBody)) {
				// Check if the key is not in updateableFields
				if (!(key in updateableFields)) {
					return res.status(400).json({ error: `Invalid field: ${key}` });
				}

				try {
					// if custom and flowRule call the caller.setFlowRule
					if (key === "flowRule") {
						// @ts-expect-error
						const caller = appRouter.createCaller(ctx);
						await caller.network.setFlowRule({
							nwid: networkId,
							updateParams: {
								flowRoute: value as string,
							},
						});
					}
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

			const network = await caller.network
				.getNetworkById({ nwid: networkId })
				.then(async (res) => {
					return res.network || null;
				});

			if (!network) {
				return res.status(401).json({ error: "Network not found or access denied." });
			}

			/**
			 * Update the network in the controller
			 */
			if (Object.keys(controllerPayload).length > 0) {
				await ztController.network_update({
					// @ts-expect-error
					ctx,
					nwid: networkId,
					// @ts-expect-error
					updateParams: controllerPayload,
				});
			}

			if (Object.keys(databasePayload).length > 0) {
				await ctx.prisma.network.update({
					where: {
						nwid: networkId,
					},
					data: {
						...databasePayload,
					},
				});
			}

			const ztControllerResponse = await ztController.ZTApiGetNetworkInfo(
				//@ts-expect-error
				ctx,
				networkId,
				false,
			);
			return res.status(200).json(ztControllerResponse?.network);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

export const GET_network = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY, requireNetworkId: true },
	async (_req, res, { networkId, ctx }) => {
		try {
			const network = await prisma.network.findUnique({
				where: { nwid: networkId },
				select: { description: true },
			});

			if (!network) {
				return res.status(401).json({ error: "Network not found or access denied." });
			}

			const ztControllerResponse = await ztController.ZTApiGetNetworkInfo(
				//@ts-expect-error
				ctx,
				networkId,
				false,
			);
			return res.status(200).json({
				...network,
				...ztControllerResponse?.network,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
