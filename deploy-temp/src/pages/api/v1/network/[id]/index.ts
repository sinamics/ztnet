import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { SecuredPrivateApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";

// Rate limit using environment configuration
const limiter = rateLimit({
	interval: RATE_LIMIT_CONFIG.API_WINDOW_MS,
	uniqueTokenPerInterval: 500,
});

export default async function apiNetworkByIdHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(
			res,
			RATE_LIMIT_CONFIG.API_MAX_REQUESTS,
			"NETWORKBYID_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_network(req, res);
			break;
		default:
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

const GET_network = SecuredPrivateApiRoute(
	{
		requireNetworkId: true,
	},
	async (_req, res, { networkId, ctx, userId }) => {
		// get the network details
		const network = await prisma.network.findUnique({
			where: { nwid: networkId, authorId: userId },
			select: { authorId: true, description: true },
		});

		// PERFORMANCE: Use lightweight version since we only need network details, not members
		try {
			const ztControllerResponse = await ztController.local_network_and_membercount(
				//@ts-expect-error
				ctx,
				networkId,
			);
			return res.status(200).json({
				...network,
				...ztControllerResponse?.network,
				memberCount: ztControllerResponse?.memberCount,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
