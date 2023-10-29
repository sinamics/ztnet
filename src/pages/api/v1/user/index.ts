import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { decryptAndVerifyToken } from "~/utils/encryption";
import rateLimit from "~/utils/rateLimit";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 10;

export default async function createUserHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "CREATE_USER_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		res.status(429).json({ error: "Rate limit exceeded" });
	}

	if (req.method !== "POST") return res.status(405).end(); // Method Not Allowed
	const apiKey = req.headers["x-ztnet-auth"] as string;

	// Count the number of users in database
	const userCount = await prisma.user.count();

	if (userCount > 0) {
		// If there are users, verify the API key
		try {
			await decryptAndVerifyToken(apiKey);
		} catch (error) {
			return res.status(401).json({ error: error.message });
		}
	}

	// Create context and caller
	const ctx = await createTRPCContext({ req, res });
	const caller = appRouter.createCaller(ctx);

	// get data from the post request
	const { email, password, name, expiresAt } = req.body;

	try {
		const user = await caller.auth.register({
			email: email as string,
			password: password as string,
			name: name as string,
			expiresAt: expiresAt as string,
		});

		return res.status(200).json(user);
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
		res.status(500).json({ message: "Internal server error" });
	}
}
