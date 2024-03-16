import { Role } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";
import * as ztController from "~/utils/ztApi";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

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

export const POST_orgCreateNewNetwork = async (
	req: NextApiRequest,
	res: NextApiResponse,
) => {
	try {
		// API Key
		const apiKey = req.headers["x-ztnet-auth"] as string;

		// organization id
		const orgid = req.query?.orgid as string;

		// organization name
		const { name } = req.body;

		if (!apiKey) {
			return res.status(400).json({ error: "API Key is required" });
		}

		if (!orgid) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		// If there are users, verify the API key
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
		// TODO This might be redundant as the caller.createOrgNetwork will check for the same thing. Keeping it for now
		await checkUserOrganizationRole({
			ctx,
			organizationId: orgid,
			minimumRequiredRole: Role.USER,
		});

		if (!orgid) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		// @ts-expect-error
		const caller = appRouter.createCaller(ctx);
		const networkAndMembers = await caller.org.createOrgNetwork({
			organizationId: orgid,
			networkName: name,
			orgName: "Created by Rest API",
		});

		return res.status(200).json(networkAndMembers);
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};

export const GET_orgUserNetworks = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;
	const orgid = req.query?.orgid as string;

	if (!apiKey) {
		return res.status(400).json({ error: "API Key is required" });
	}

	if (!orgid) {
		return res.status(400).json({ error: "Organization ID is required" });
	}

	try {
		const decryptedData: { userId: string; name?: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		// If there are users, verify the API key
		const ctx = {
			session: {
				user: {
					id: decryptedData.userId as string,
				},
			},
			prisma,
		};

		// Check if the user is an organization admin
		// TODO This might be redundant as the caller.createOrgNetwork will check for the same thing. Keeping it for now
		await checkUserOrganizationRole({
			ctx,
			organizationId: orgid,
			minimumRequiredRole: Role.USER,
		});
		// @ts-expect-error
		const caller = appRouter.createCaller(ctx);
		const organization = await caller.org
			.getOrgById({ organizationId: orgid })
			.then(async (org) => {
				// Make sure to use `async` here to allow await inside
				// Use Promise.all to wait for all network detail fetches to complete
				const networksDetails = await Promise.all(
					org.networks.map(async (network) => {
						//@ts-expect-error ctx is mocked
						const controller = await ztController.local_network_detail(ctx, network.nwid);
						return controller.network;
					}),
				);
				return networksDetails;
			});

		return res.status(200).json(organization);
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};
