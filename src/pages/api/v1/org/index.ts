import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

export default async function apiOrganizationHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "GET_ORGANIZATION_CACHE_TOKEN"); // 10 requests per minute
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
