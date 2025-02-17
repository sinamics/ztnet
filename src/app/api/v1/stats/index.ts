import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { SecuredPrivateApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import { globalSiteVersion } from "~/utils/global";
import rateLimit from "~/utils/rateLimit";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

export default async function createStatsHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "CREATE_USER_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_stats(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const GET_stats = SecuredPrivateApiRoute(
	{
		requireNetworkId: false,
		requireAdmin: true,
	},
	async (_req, res) => {
		try {
			// get number of users
			const users = await prisma.user.count();

			// get number of networks
			const networks = await prisma.network.count();

			// get number of members
			const networkMembers = await prisma.network_members.count();

			// get application version
			const appVersion = globalSiteVersion;

			// get logins last 24 hours
			const loginsLast24h = await prisma.user.count({
				where: {
					lastLogin: {
						gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
					},
				},
			});

			// get UserInvitation
			const pendingUserInvitations = await prisma.invitation.count();

			// get pending Webhook
			const activeWebhooks = await prisma.webhook.count();

			// get uptime
			const ztnetUptime = process.uptime();

			// get if customPlanetUsed is used
			const rootServer = await prisma.planet.count();

			// get global options
			const globalOptions = await prisma.globalOptions.findFirst({
				where: {
					id: 1,
				},
			});

			// return all json
			return res.status(200).json({
				users,
				networks,
				networkMembers,
				appVersion,
				loginsLast24h,
				pendingUserInvitations,
				activeWebhooks,
				ztnetUptime,
				registrationEnabled: globalOptions?.enableRegistration || false,
				hasPrivatRoot: !!rootServer,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
