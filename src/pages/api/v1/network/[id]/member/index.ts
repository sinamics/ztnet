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

export default async function apiNetworkMembersHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "NETWORK_MEMBERS_CACHE_TOKEN"); // 10 requests per minute
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
			const controllerMember = await ztController.local_network_detail(
				// @ts-expect-error: fake request object
				ctx,
				networkId,
				false,
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
