import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
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
			res.status(405).end();
			break;
	}
}

const GET_userOrganization = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;

	try {
		const decryptedData: { userId: string; name: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		const orgUserRole = await prisma.userOrganizationRole.findFirst({
			where: {
				userId: decryptedData.userId,
			},
			select: {
				role: true, // Only select the role
			},
		});

		// If the user is not part of the organization or the role is not in the Role enum
		if (!orgUserRole || orgUserRole.role in Role === false) {
			return res.status(403).json({ error: "Unauthorized" });
		}

		// get all organizations the user is part of.
		const organizations = await prisma.organization
			.findMany({
				where: {
					users: {
						some: {
							id: decryptedData.userId,
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
};
