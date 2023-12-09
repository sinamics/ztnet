import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { decryptAndVerifyToken } from "~/utils/encryption";
import rateLimit from "~/utils/rateLimit";
import * as ztController from "~/utils/ztApi";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

export default async function createNetworkHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "CREATE_USER_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_network(req, res);
			break;
		default:
			res.status(405).end();
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
		decryptedData = await decryptAndVerifyToken({ apiKey });
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
		if (cause instanceof TRPCError) {
			const httpCode = getHTTPStatusCodeFromError(cause);
			try {
				const parsedErrors = JSON.parse(cause.message);
				return res.status(httpCode).json({ cause: parsedErrors });
			} catch (_error) {
				return res.status(httpCode).json({ error: cause.message });
			}
		}
		return res.status(500).json({ message: "Internal server error" });
	}
};
