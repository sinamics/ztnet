import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

export const REQUEST_PR_MINUTE = 50;

export default async function apiNetworkHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_GET_CACHE_TOKEN");
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_orgById(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const GET_orgById = async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const apiKey = req.headers["x-ztnet-auth"] as string;
		const orgid = req.query?.orgid as string;

		if (!apiKey) {
			return res.status(400).json({ error: "API Key is required" });
		}

		if (!orgid) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		const decryptedData: { userId: string; name?: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		// Mock context
		const ctx = {
			session: {
				user: {
					id: decryptedData.userId as string,
				},
			},
			prisma,
		};

		// Check if the user is an organization admin
		// TODO This might be redundant as the caller.getOrgById will check for the same thing
		await checkUserOrganizationRole({
			ctx,
			organizationId: orgid,
			minimumRequiredRole: Role.READ_ONLY,
		});

		//@ts-expect-error
		const caller = appRouter.createCaller(ctx);
		const organization = await caller.org
			.getOrgById({
				organizationId: orgid,
			})
			// modify the response to only inlude certain fields
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
};
