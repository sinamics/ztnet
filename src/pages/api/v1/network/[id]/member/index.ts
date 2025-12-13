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

export default async function apiNetworkMembersHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(
			res,
			RATE_LIMIT_CONFIG.API_MAX_REQUESTS,
			"NETWORK_MEMBERS_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_networkMembers(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

const GET_networkMembers = SecuredPrivateApiRoute(
	{
		requireNetworkId: true,
	},
	async (_req, res, { networkId, ctx }) => {
		try {
			const controllerMember = await ztController.local_network_and_members(
				// @ts-expect-error: fake request object
				ctx,
				networkId,
			);

			const networkMembers = await Promise.all(
				controllerMember.members.map(async (member) => {
					const dbMember = await prisma.network_members.findUnique({
						where: {
							id_nwid: {
								nwid: member.nwid,
								id: member.id,
							},
						},
					});

					return { ...dbMember, ...member };
				}),
			);

			return res.status(200).json(networkMembers);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
