import type { NextApiRequest, NextApiResponse } from "next";
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

export default async function apiNetworkByIdHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "NETWORKBYID_CACHE_TOKEN"); // 10 requests per minute
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

		try {
			const ztControllerResponse = await ztController.local_network_detail(
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
