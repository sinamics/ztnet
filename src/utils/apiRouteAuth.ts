import { NextApiRequest, NextApiResponse } from "next";
import { handleApiErrors } from "~/utils/errors";
import { checkUserOrganizationRole } from "~/utils/role";
import { Role } from "@prisma/client";
import { prisma } from "~/server/db";
import { decryptAndVerifyToken } from "./encryption";
import { AuthorizationType } from "~/types/apiTypes";
import { z } from "zod";

// Schema for API request headers and query parameters
const ApiRequestSchema = z.object({
	headers: z.object({
		"x-ztnet-auth": z.string(),
	}),
	query: z.object({
		orgid: z.string().optional(),
		nwid: z.string().optional(),
		memberId: z.string().optional(),
		id: z.string().optional(),
	}),
	body: z.any(),
});

/**
 * Organization API handler wrapper for apir routes that require authentication
 */
type OrgApiHandler = (
	req: NextApiRequest,
	res: NextApiResponse,
	context: {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		body: any;
		userId: string;
		orgId: string;
		networkId?: string;
		memberId?: string;
		ctx: {
			prisma: typeof prisma;
			session: {
				user: {
					id: string;
				};
			};
		};
	},
) => Promise<void>;

/**
 * Wrapper for organization API routes
 * @param options - Options for the API route
 * @param handler - The API route handler
 */
export const SecuredOrganizationApiRoute = (
	options: {
		requiredRole: Role;
		requireNetworkId?: boolean;
		requireOrgId?: boolean;
	},
	handler: OrgApiHandler,
) => {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		try {
			const validatedRequest = ApiRequestSchema.parse(req);

			const apiKey = validatedRequest.headers["x-ztnet-auth"] as string;
			const orgId = validatedRequest.query?.orgid as string;
			const networkId = validatedRequest.query?.nwid as string;
			const memberId = validatedRequest.query?.memberId as string;
			const body = validatedRequest.body;

			const mergedOptions = {
				// Set orgid as required by default
				requireOrgId: true,
				...options,
			};

			if (!apiKey) {
				return res.status(400).json({ error: "API Key is required" });
			}

			if (mergedOptions.requireOrgId && !orgId) {
				return res.status(400).json({ error: "Organization ID is required" });
			}

			if (mergedOptions.requireNetworkId && !networkId) {
				return res.status(400).json({ error: "Network ID is required" });
			}

			const decryptedData = await decryptAndVerifyToken({
				apiKey,
				apiAuthorizationType: AuthorizationType.ORGANIZATION,
			});

			const ctx = {
				session: {
					user: {
						id: decryptedData.userId as string,
					},
				},
				prisma,
			};

			await checkUserOrganizationRole({
				ctx,
				organizationId: orgId,
				minimumRequiredRole: mergedOptions.requiredRole,
			});

			await handler(req, res, {
				body,
				userId: decryptedData.userId,
				orgId,
				networkId,
				memberId,
				ctx,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	};
};

type UserApiHandler = (
	req: NextApiRequest,
	res: NextApiResponse,
	context: {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		body: any;
		userId: string;
		networkId?: string;
		memberId?: string;
		ctx: {
			session: {
				user: {
					id: string;
				};
			};
			prisma: typeof prisma;
		};
	},
) => Promise<void>;

export const SecuredPrivateApiRoute = (
	options: {
		requireNetworkId?: boolean;
		requireMemberId?: boolean;
		requireAdmin?: boolean;
	},
	handler: UserApiHandler,
) => {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		const validatedRequest = ApiRequestSchema.parse(req);

		const apiKey = validatedRequest.headers["x-ztnet-auth"] as string;
		const networkId = validatedRequest.query?.id as string;
		const memberId = validatedRequest.query?.memberId as string;
		const body = validatedRequest.body;

		const mergedOptions = {
			// Set networkId as required by default
			requireNetworkId: true,
			...options,
		};

		try {
			if (!apiKey) {
				return res.status(400).json({ error: "API Key is required" });
			}

			if (mergedOptions.requireNetworkId && !networkId) {
				return res.status(400).json({ error: "Network ID is required" });
			}

			if (mergedOptions.requireMemberId && !memberId) {
				return res.status(400).json({ error: "Member ID is required" });
			}

			const decryptedData = await decryptAndVerifyToken({
				apiKey,
				apiAuthorizationType: AuthorizationType.PERSONAL,
				requireAdmin: mergedOptions.requireAdmin,
			});

			if (mergedOptions.requireNetworkId) {
				// make sure the user is the owner of the network
				const userIsAuthor = await prisma.network.findUnique({
					where: { nwid: networkId, authorId: decryptedData.userId },
					select: { authorId: true, description: true },
				});

				if (
					(networkId && !userIsAuthor) ||
					userIsAuthor.authorId !== decryptedData.userId
				) {
					return res.status(401).json({ error: "Network not found or access denied." });
				}
			}

			const ctx = {
				session: {
					user: {
						id: decryptedData.userId as string,
					},
				},
				prisma,
			};

			await handler(req, res, {
				body,
				userId: decryptedData.userId,
				networkId,
				memberId,
				ctx,
			});
		} catch (cause) {
			console.error("catch cause", cause);
			return handleApiErrors(cause, res);
		}
	};
};
