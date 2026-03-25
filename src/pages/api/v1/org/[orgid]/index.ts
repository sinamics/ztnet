import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import { updateOrgSchema } from "../_schema";

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
			"ORGANIZATION_GET_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_orgById(req, res);
			break;
		case "PUT":
			await PUT_updateOrg(req, res);
			break;
		case "DELETE":
			await DELETE_org(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const GET_orgById = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY },
	async (_req, res, { orgId, ctx }) => {
		try {
			//@ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const organization = await caller.org
				.getOrgById({
					organizationId: orgId,
				})
				// modify the response to only include certain fields
				.then((org) => {
					return {
						id: org.id,
						name: org.orgName,
						createdAt: org.createdAt,
						ownerId: org.ownerId,
						networks: org.networks.map((network) => {
							return {
								nwid: network.nwid,
								name: network.name,
							};
						}),
					};
				});

			return res.status(200).json(organization);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

/**
 * PUT /api/v1/org/:orgId - Update organization metadata
 *
 * Requires ADMIN role in the organization.
 * Body: { name?: string, description?: string }
 */
const PUT_updateOrg = SecuredOrganizationApiRoute(
	{ requiredRole: Role.ADMIN },
	async (_req, res, { orgId, body }) => {
		try {
			const validatedInput = updateOrgSchema.parse(body);

			const updateData: Record<string, string> = {};
			if (validatedInput.name !== undefined) {
				updateData.orgName = validatedInput.name;
			}
			if (validatedInput.description !== undefined) {
				updateData.description = validatedInput.description;
			}

			if (Object.keys(updateData).length === 0) {
				return res.status(400).json({ error: "No fields to update" });
			}

			const updated = await prisma.organization.update({
				where: { id: orgId },
				data: updateData,
			});

			return res.status(200).json({
				id: updated.id,
				orgName: updated.orgName,
				description: updated.description,
				ownerId: updated.ownerId,
				createdAt: updated.createdAt,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

/**
 * DELETE /api/v1/org/:orgId - Delete an organization
 *
 * Requires ADMIN role and the user must be the owner of the organization.
 * This will also delete all networks on the ZeroTier controller.
 */
const DELETE_org = SecuredOrganizationApiRoute(
	{ requiredRole: Role.ADMIN },
	async (_req, res, { orgId, userId, ctx }) => {
		try {
			// Verify the user is the owner
			const org = await prisma.organization.findUnique({
				where: { id: orgId },
				include: { networks: true },
			});

			if (!org) {
				return res.status(404).json({ error: "Organization not found" });
			}

			if (org.ownerId !== userId) {
				return res.status(403).json({
					error: "Only the organization owner can delete it",
				});
			}

			// Delete all networks on the controller via tRPC caller
			//@ts-expect-error
			const caller = appRouter.createCaller(ctx);
			for (const nw of org.networks) {
				try {
					await caller.org.deleteOrgNetwork({
						nwid: nw.nwid,
						organizationId: orgId,
					});
				} catch (_error) {
					// Continue even if individual network deletion fails on the controller
				}
			}

			// Delete the organization and all related data
			await prisma.$transaction(async (tx) => {
				await tx.activityLog.deleteMany({
					where: { organizationId: orgId },
				});
				await tx.organization.deleteMany({
					where: { id: orgId },
				});
			});

			return res.status(200).json({ message: "Organization deleted successfully" });
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
