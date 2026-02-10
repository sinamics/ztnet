import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit, { RATE_LIMIT_CONFIG } from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";
import { createNetworkContextSchema } from "./_schema";
import { prisma } from "~/server/db";

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
			"ORGANIZATION_NETWORK_CACHE_TOKEN",
		);
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_orgUserNetworks(req, res);
			break;
		case "POST":
			await POST_orgCreateNewNetwork(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const POST_orgCreateNewNetwork = SecuredOrganizationApiRoute(
	{ requiredRole: Role.USER },
	async (_req, res, context) => {
		try {
			// Validate the context (which includes the body)
			const validatedContext = createNetworkContextSchema.parse(context);
			const { body, orgId, ctx } = validatedContext;

			// organization name
			const { name } = body;

			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const networkAndMembers = await caller.org.createOrgNetwork({
				organizationId: orgId,
				networkName: name,
				orgName: "Created by Rest API",
			});

			return res.status(200).json(networkAndMembers);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);

export const GET_orgUserNetworks = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY },
	async (_req, res, { orgId, ctx }) => {
		try {
			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const organization = await caller.org
				.getOrgById({ organizationId: orgId })
				.then(async (org) => {
					// Fetch all network descriptions in a single query
					const networkDescriptions = await prisma.network.findMany({
						where: { nwid: { in: org.networks.map((n) => n.nwid) } },
						select: { nwid: true, description: true },
					});

					// Create a map for quick lookup
					const descriptionMap = new Map(
						networkDescriptions.map((n) => [n.nwid, { description: n.description }]),
					);

					// Use Promise.all to wait for all network detail fetches to complete
					// PERFORMANCE: Use lightweight version to avoid N+1 HTTP calls for member details
					const networksDetails = await Promise.all(
						org.networks.map(async (network) => {
							const controller = await ztController.local_network_and_membercount(
								//@ts-expect-error ctx is mocked
								ctx,
								network.nwid,
							);
							const dbInfo = descriptionMap.get(network.nwid) || {
								description: null,
							};
							return {
								...dbInfo,
								...controller.network,
								memberCount: controller.memberCount,
							};
						}),
					);
					return networksDetails;
				});

			return res.status(200).json(organization);
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
