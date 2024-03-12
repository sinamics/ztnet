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

	let decryptedData: { userId: string; name: string };
	try {
		decryptedData = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}

	try {
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
				// only return the organization where the user has Admin role
				return orgs.filter((org) => {
					const user = org.users.find((user) => user.id === decryptedData.userId);
					const adminMember = user?.organizationRoles.some(
						(role) => role.role === "ADMIN",
					);
					// only return org without user object.
					if (adminMember) {
						org.users = undefined;
						return org;
					}
				});
			});

		return res.status(200).json(organizations);
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};
