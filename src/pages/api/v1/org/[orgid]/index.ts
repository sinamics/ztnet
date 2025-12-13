import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";

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
	},
);
