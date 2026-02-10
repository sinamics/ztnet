import type { NextApiRequest, NextApiResponse } from "next";
import { networkProvisioningFactory } from "~/server/api/services/networkService";
import { prisma } from "~/server/db";
import { SecuredPrivateApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";
import { createNetworkContextSchema } from "./_schema";

// Rate limit using environment configuration
const limiter = rateLimit({
	interval: RATE_LIMIT_CONFIG.API_WINDOW_MS,
	uniqueTokenPerInterval: 500,
});

export default async function apiNetworkHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, RATE_LIMIT_CONFIG.API_MAX_REQUESTS, "NETWORK_CACHE_TOKEN");
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_userNetworks(req, res);
			break;
		case "POST":
			await POST_createNewNetwork(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

const POST_createNewNetwork = SecuredPrivateApiRoute(
	{
		requireNetworkId: false,
	},
	async (_req, res, context) => {
		try {
			// Validate the context (which includes the body)
			const validatedContext = createNetworkContextSchema.parse(context);
			const { body, ctx } = validatedContext;

			// If there are users, verify the API key
			const { name } = body;

			const newNetworkId = await networkProvisioningFactory({
				ctx,
				input: { central: false, name },
			});

			return res.status(200).json(newNetworkId);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

const GET_userNetworks = SecuredPrivateApiRoute(
	{
		requireNetworkId: false,
	},
	async (_req, res, { ctx, userId }) => {
		try {
			const userWithNetworks = await prisma.user.findUnique({
				where: {
					id: userId,
				},
				select: {
					network: {
						select: {
							nwid: true,
							description: true,
							authorId: true,
						},
					},
				},
			});

			if (!userWithNetworks || !userWithNetworks.network) {
				return res.status(404).json({ error: "User or networks not found" });
			}

			// PERFORMANCE: Use lightweight version since we only need network details, not members
			const networksWithDetails = await Promise.all(
				userWithNetworks.network.map(async (network) => {
					const ztControllerResponse = await ztController.local_network_and_membercount(
						//@ts-expect-error
						ctx,
						network.nwid,
					);
					return {
						...network,
						...ztControllerResponse.network,
						memberCount: ztControllerResponse.memberCount,
					};
				}),
			);
			return res.status(200).json(networksWithDetails);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
