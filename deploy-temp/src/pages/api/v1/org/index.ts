import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";

// Rate limit using environment configuration
const limiter = rateLimit({
	interval: RATE_LIMIT_CONFIG.API_WINDOW_MS,
	uniqueTokenPerInterval: 500,
});

export default async function apiOrganizationHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(
			res,
			RATE_LIMIT_CONFIG.API_MAX_REQUESTS,
			"GET_ORGANIZATION_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_userOrganization(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const GET_userOrganization = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY, requireOrgId: false },
	async (_req, res, { userId }) => {
		try {
			// get all organizations the user is part of.
			const organizations = await prisma.organization
				.findMany({
					where: {
						users: {
							some: {
								id: userId,
							},
						},
					},
					select: {
						id: true,
						orgName: true,
						ownerId: true,
						description: true,
						createdAt: true,
						users: {
							select: {
								id: true,
								name: true,
								email: true,
								organizationRoles: {
									select: {
										role: true,
									},
								},
							},
						},
					},
				})
				.then((orgs) => {
					return orgs.filter((org) => {
						org.users = undefined;
						return org;
					});
				});

			return res.status(200).json(organizations);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
