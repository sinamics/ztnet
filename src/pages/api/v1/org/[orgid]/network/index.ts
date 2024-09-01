import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { appRouter } from "~/server/api/root";
import { SecuredOrganizationApiRoute } from "~/utils/apiRouteAuth";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

export const REQUEST_PR_MINUTE = 50;

// Schema for the request body when creating a new network
const createNetworkBodySchema = z
	.object({
		name: z.string().optional(),
	})
	.strict();

// Schema for the context passed to the handler
const createNetworkContextSchema = z.object({
	body: createNetworkBodySchema,
	orgId: z.string(),
	ctx: z.object({
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});

export default async function apiNetworkHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_NETWORK_CACHE_TOKEN"); // 10 requests per minute
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
	{ requiredRole: Role.USER },
	async (_req, res, { orgId, ctx }) => {
		try {
			// @ts-expect-error
			const caller = appRouter.createCaller(ctx);
			const organization = await caller.org
				.getOrgById({ organizationId: orgId })
				.then(async (org) => {
					// Use Promise.all to wait for all network detail fetches to complete
					const networksDetails = await Promise.all(
						org.networks.map(async (network) => {
							const controller = await ztController.local_network_detail(
								//@ts-expect-error ctx is mocked
								ctx,
								network.nwid,
							);
							return controller.network;
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
