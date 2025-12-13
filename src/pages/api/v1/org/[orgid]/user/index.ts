import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";

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
		await limiter.check(
			res,
			RATE_LIMIT_CONFIG.API_MAX_REQUESTS,
			"ORGANIZATION_GET_USER_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_organizationUsers(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

const GET_organizationUsers = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY },
	async (_req, res, { orgId, ctx }) => {
		try {
			// @ts-expect-error ctx is not a valid parameter
			const caller = appRouter.createCaller(ctx);
			const orgUsers = await caller.org
				.getOrgUsers({
					organizationId: orgId,
				})
				.then((users) => {
					return users.map((user) => ({
						orgId: orgId,
						userId: user.id,
						name: user.name,
						email: user.email,
						role: user.role,
					}));
				});

			return res.status(200).json(orgUsers);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
