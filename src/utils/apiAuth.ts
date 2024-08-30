import { NextApiRequest, NextApiResponse } from "next";
import { handleApiErrors } from "~/utils/errors";
import { checkUserOrganizationRole } from "~/utils/role";
import { Role } from "@prisma/client";
import { prisma } from "~/server/db";
import { decryptAndVerifyToken } from "./encryption";
import { AuthorizationType } from "~/types/apiTypes";

/**
 * Organization API handler wrapper for apir routes that require authentication
 */
type ApiHandler = (
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

export const SecuredOrganizationApiRoute = (
	options: {
		requiredRole: Role;
		requireNetworkId?: boolean;
		requireOrgId?: boolean;
	},
	handler: ApiHandler,
) => {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		const apiKey = req.headers["x-ztnet-auth"] as string;
		const orgId = req.query?.orgid as string;
		const networkId = req.query?.nwid as string;
		const memberId = req.query?.memberId as string;
		const body = req.body;

		const mergedOptions = {
			// Set orgid as required by default
			requireOrgId: true,
			...options,
		};

		try {
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
