import type { NextApiRequest, NextApiResponse } from "next";
import { networkProvisioningFactory } from "~/server/api/services/networkService";
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

export default async function apiNetworkHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "NETWORK_CACHE_TOKEN"); // 10 requests per minute
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
	async (_req, res, { body, ctx }) => {
		// If there are users, verify the API key
		try {
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
			const networks = await prisma.user.findFirst({
				where: {
					id: userId,
				},
				select: {
					network: true,
				},
			});
			const arr = [];
			// biome-ignore lint/correctness/noUnsafeOptionalChaining: <explanation>
			for (const network of networks?.network) {
				const ztControllerResponse = await ztController.local_network_detail(
					//@ts-expect-error
					ctx,
					network.nwid,
					false,
				);
				arr.push(ztControllerResponse.network);
			}

			return res.status(200).json(arr);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
