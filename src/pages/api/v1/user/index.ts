import { PrismaClient, User } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import { createUserSchema } from "./_schema";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

export default async function createUserHandler(
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
		case "POST":
			await POST_createUser(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}

interface UserResponse {
	user?: User;
	Error?: string;
	apiToken?: string;
}

export const POST_createUser = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;

	const NEEDS_ADMIN = true;

	// Count the number of users in database
	const userCount = await prisma.user.count();

	try {
		if (userCount > 0) {
			// If there are users, verify the API key
			await decryptAndVerifyToken({
				apiKey,
				requireAdmin: NEEDS_ADMIN,
				apiAuthorizationType: AuthorizationType.PERSONAL,
			});
		}

		// Input validation
		const validatedInput = createUserSchema.parse(req.body);

		// get data from the post request
		const { email, password, name, expiresAt, generateApiToken } = validatedInput;

		if (userCount === 0 && expiresAt !== undefined) {
			return res.status(400).json({ message: "Cannot add expiresAt for Admin user!" });
		}

		// Check if expiresAt is a valid date
		if (expiresAt !== undefined) {
			const date = new Date(expiresAt);
			const isoString = date.toISOString();

			if (expiresAt !== isoString) {
				return res.status(400).json({ message: "Invalid expiresAt date" });
			}
		}

		/**
		 *
		 * Create a transaction to make sure the user and API token are created together
		 *
		 */
		const result = await prisma.$transaction(async (transactionPrisma) => {
			// Create context with the transaction-aware Prisma instance
			const ctx = await createTRPCContext({ req, res });

			// Update the context to use the transaction-aware Prisma client
			ctx.prisma = transactionPrisma as PrismaClient;

			// Use the updated context with the transaction-aware Prisma client for operations
			const transactionCaller = appRouter.createCaller(ctx);

			// Perform operations using transactionCaller, which now includes the transaction-aware Prisma client
			const registerResponse = (await transactionCaller.auth.register({
				email: email,
				password: password,
				name: name,
				expiresAt: expiresAt,
			})) as UserResponse;

			if (!registerResponse.user) {
				throw new Error("User registration failed");
			}

			const ctxWithUser = {
				session: {
					user: {
						id: registerResponse.user.id,
					},
				},
				prisma: transactionPrisma,
			};

			// @ts-expect-error fake context
			const transactionCallerWithUserCtx = appRouter.createCaller(ctxWithUser);

			let apiToken: string;
			if (generateApiToken !== undefined) {
				if (generateApiToken) {
					const tokenResponse = await transactionCallerWithUserCtx.auth.addApiToken({
						name: "Generated Token via API",
						apiAuthorizationType: ["PERSONAL", "ORGANIZATION"],
						daysToExpire: "1",
					});

					if (!tokenResponse.token) {
						throw new Error("API token generation failed");
					}

					apiToken = tokenResponse.token;
				}
			}

			// Return the user and optionally the API token
			return { user: registerResponse.user, apiToken };
		});
		return res.status(200).json(result);
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};
