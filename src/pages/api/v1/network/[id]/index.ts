import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
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
		await limiter.check(res, REQUEST_PR_MINUTE, "NETWORK_CACHE_TOKEN"); // 10 requests per minute
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

const GET_network = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;
	const networkId = req.query?.id as string;

	// Check if the networkId exists
	if (!networkId) {
		return res.status(400).json({ error: "Network ID is required" });
	}

	let decryptedData: { userId: string; name?: string };
	try {
		decryptedData = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.PERSONAL,
		});
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}

	// assemble the context object
	const ctx = {
		session: {
			user: {
				id: decryptedData.userId as string,
			},
		},
		prisma,
	};
	// make sure user has access to the network
	const network = await prisma.network.findUnique({
		where: { nwid: networkId, authorId: decryptedData.userId },
		select: { nwid: true, name: true, authorId: true },
	});

	if (!network) {
		return res.status(401).json({ error: "Network not found or access denied." });
	}

	try {
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
