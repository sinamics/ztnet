import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";

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
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_GET_USER_CACHE_TOKEN"); // 10 requests per minute
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
	{ requiredRole: Role.USER },
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
