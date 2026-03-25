import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import { addUserToOrgSchema, inviteUserSchema } from "../../_schema";

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
		case "POST":
			await POST_addOrInviteUser(req, res);
			break;
		case "DELETE":
			await DELETE_removeUser(req, res);
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

/**
 * POST /api/v1/org/:orgId/user - Add an existing user or invite by email
 *
 * Requires ADMIN role in the organization.
 *
 * To add an existing user by ID:
 *   Body: { userId: string, role?: "READ_ONLY" | "USER" | "ADMIN" }
 *
 * To invite a user by email (sends invitation email):
 *   Body: { email: string, role?: "READ_ONLY" | "USER" | "ADMIN" }
 */
const POST_addOrInviteUser = SecuredOrganizationApiRoute(
	{ requiredRole: Role.ADMIN },
	async (_req, res, { orgId, body, userId, ctx }) => {
		try {
			// Determine if this is an add-by-id or invite-by-email request
			if (body.userId) {
				// Add existing user by ID
				const validatedInput = addUserToOrgSchema.parse(body);

				// Check if user exists
				const targetUser = await prisma.user.findUnique({
					where: { id: validatedInput.userId },
					select: { id: true, name: true, email: true },
				});

				if (!targetUser) {
					return res.status(404).json({ error: "User not found" });
				}

				// Check if already a member
				const existingRole = await prisma.userOrganizationRole.findFirst({
					where: {
						organizationId: orgId,
						userId: validatedInput.userId,
					},
				});

				if (existingRole) {
					return res.status(409).json({
						error: "User is already a member of this organization",
					});
				}

				// Add user to org
				await prisma.organization.update({
					where: { id: orgId },
					data: {
						userRoles: {
							create: {
								userId: validatedInput.userId,
								role: validatedInput.role as Role,
							},
						},
						users: {
							connect: { id: validatedInput.userId },
						},
					},
				});

				// Log the action
				await prisma.activityLog.create({
					data: {
						action: `Added user ${targetUser.name} to organization via API.`,
						performedById: userId,
						organizationId: orgId,
					},
				});

				return res.status(200).json({
					message: "User added to organization",
					userId: validatedInput.userId,
					role: validatedInput.role,
				});
			} else if (body.email) {
				// Invite user by email via tRPC caller
				const validatedInput = inviteUserSchema.parse(body);

				// @ts-expect-error ctx is not a valid parameter
				const caller = appRouter.createCaller(ctx);
				await caller.org.inviteUserByMail({
					organizationId: orgId,
					email: validatedInput.email,
					role: validatedInput.role as Role,
				});

				return res.status(200).json({
					message: "Invitation sent successfully",
					email: validatedInput.email,
					role: validatedInput.role,
				});
			} else {
				return res.status(400).json({
					error: "Request body must contain either 'userId' (to add existing user) or 'email' (to send invitation)",
				});
			}
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

/**
 * DELETE /api/v1/org/:orgId/user - Remove a user from an organization
 *
 * Requires ADMIN role in the organization.
 * Body: { userId: string }
 */
const DELETE_removeUser = SecuredOrganizationApiRoute(
	{ requiredRole: Role.ADMIN },
	async (_req, res, { orgId, body, userId }) => {
		try {
			const targetUserId = body?.userId as string;
			if (!targetUserId) {
				return res.status(400).json({ error: "userId is required" });
			}

			// Cannot remove the owner
			const org = await prisma.organization.findUnique({
				where: { id: orgId },
				select: { ownerId: true },
			});

			if (org?.ownerId === targetUserId) {
				return res.status(403).json({
					error: "Cannot remove the organization owner",
				});
			}

			// Check if user is actually a member
			const membership = await prisma.userOrganizationRole.findFirst({
				where: {
					organizationId: orgId,
					userId: targetUserId,
				},
			});

			if (!membership) {
				return res.status(404).json({
					error: "User is not a member of this organization",
				});
			}

			// Get target user name for logging
			const targetUser = await prisma.user.findUnique({
				where: { id: targetUserId },
				select: { name: true },
			});

			// Remove user role and disconnect from org
			await prisma.$transaction(async (tx) => {
				await tx.userOrganizationRole.delete({
					where: {
						userId_organizationId: {
							userId: targetUserId,
							organizationId: orgId,
						},
					},
				});
				await tx.organization.update({
					where: { id: orgId },
					data: {
						users: {
							disconnect: { id: targetUserId },
						},
					},
				});
			});

			// Log the action
			await prisma.activityLog.create({
				data: {
					action: `Removed user ${targetUser?.name || targetUserId} from organization via API.`,
					performedById: userId,
					organizationId: orgId,
				},
			});

			return res.status(200).json({
				message: "User removed from organization",
				userId: targetUserId,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
