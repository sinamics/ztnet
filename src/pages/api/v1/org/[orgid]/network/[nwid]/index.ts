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

export default async function apiNetworkByIdHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_NETWORKID_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_network(req, res);
			break;
		default:
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

export const GET_network = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;

	// network id
	const networkId = req.query?.nwid as string;

	// organization id
	const orgid = req.query?.orgid as string;

	try {
		if (!apiKey) {
			return res.status(400).json({ error: "API Key is required" });
		}

		if (!networkId) {
			return res.status(400).json({ error: "Network ID is required" });
		}

		if (!orgid) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		const decryptedData: { userId: string; name?: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		// assemble the context object
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
		const network = await caller.network
			.getNetworkById({ nwid: networkId })
			.then(async (res) => {
				return res.network || null;
			});

		if (!network) {
			return res.status(401).json({ error: "Network not found or access denied." });
		}

		const ztControllerResponse = await ztController.local_network_detail(
			//@ts-expect-error
			ctx,
			networkId,
			false,
		);
		return res.status(200).json(ztControllerResponse?.network);
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};
