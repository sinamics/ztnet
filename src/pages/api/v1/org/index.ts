import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import { createOrgSchema } from "./_schema";

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
		case "POST":
			await POST_createOrganization(req, res);
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

/**
 * POST /api/v1/org - Create a new organization
 *
 * Requires an admin-level API key (PERSONAL type with admin role).
 * The authenticated user becomes the owner and first admin of the organization.
 *
 * Body: { name: string, description?: string }
 * Returns: { id, orgName, description, ownerId, createdAt }
 */
const POST_createOrganization = async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const apiKey = req.headers["x-ztnet-auth"] as string;

		if (!apiKey) {
			return res.status(400).json({ error: "API Key is required" });
		}

		// Verify the API key and require admin role
		const decryptedData = await decryptAndVerifyToken({
			apiKey,
			requireAdmin: true,
			apiAuthorizationType: AuthorizationType.PERSONAL,
		});

		// Validate request body
		const validatedInput = createOrgSchema.parse(req.body);

		const newOrg = await prisma.$transaction(async (tx) => {
			// Create the organization with the user as owner and member
			const org = await tx.organization.create({
				data: {
					orgName: validatedInput.name,
					description: validatedInput.description || null,
					ownerId: decryptedData.userId,
					users: {
						connect: { id: decryptedData.userId },
					},
				},
			});

			// Set the user's role as ADMIN in the organization
			await tx.userOrganizationRole.create({
				data: {
					userId: decryptedData.userId,
					organizationId: org.id,
					role: "ADMIN",
				},
			});

			return org;
		});

		return res.status(201).json({
			id: newOrg.id,
			orgName: newOrg.orgName,
			description: newOrg.description,
			ownerId: newOrg.ownerId,
			createdAt: newOrg.createdAt,
		});
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};
