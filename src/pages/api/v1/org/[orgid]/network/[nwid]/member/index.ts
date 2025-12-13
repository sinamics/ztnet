import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";

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
			"ORGANIZATION_NETWORK_MEMBERS_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_orgNetworkMembers(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const GET_orgNetworkMembers = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY, requireNetworkId: true },
	async (_req, res, { networkId, orgId, ctx }) => {
		try {
			// Check if the user is an organization admin
			// TODO This might be redundant as the caller.createOrgNetwork will check for the same thing. Keeping it for now
			await checkUserOrganizationRole({
				ctx,
				organizationId: orgId,
				minimumRequiredRole: Role.USER,
			});

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const response = await caller.network.getNetworkById({ nwid: networkId });

			if (!response?.network) {
				return res.status(401).json({ error: "Network not found or access denied." });
			}

			return res.status(200).json(response?.members);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
