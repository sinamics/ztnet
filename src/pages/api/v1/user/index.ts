import { $Enums } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";

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
			res.status(405).end();
			break;
	}
}

interface ResponseType {
	user: {
		name: string;
		email: string;
		id: string;
		expiresAt: Date;
		role: $Enums.Role;
	};
	apiToken?: string; // Make apiToken an optional property
}

const POST_createUser = async (req: NextApiRequest, res: NextApiResponse) => {
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

		// Create context and caller
		const ctx = await createTRPCContext({ req, res });
		const caller = appRouter.createCaller(ctx);

		// get data from the post request
		const { email, password, name, expiresAt, generateApiToken } = req.body;

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

		const register = (await caller.auth.register({
			email: email,
			password: password,
			name: name,
			expiresAt: expiresAt,
		})) as ResponseType;

		if (register.user === undefined) {
			return res.status(500).json({ message: "Internal server error" });
		}
		// creat fake context
		const fakeCtx = {
			session: {
				user: {
					id: register.user.id,
				},
			},
			prisma,
		};

		// @ts-ignore fake context
		const tokenCaller = appRouter.createCaller(fakeCtx);
		let apiToken: string | undefined;
		if (generateApiToken !== undefined) {
			if (typeof generateApiToken !== "boolean") {
				return res.status(400).json({ message: "generateApiToken must be a boolean" });
			}
			// generate a new API token
			if (generateApiToken) {
				const tokenResponse = await tokenCaller.auth.addApiToken({
					name: "Generated Token via API",
					apiAuthorizationType: ["PERSONAL", "ORGANIZATION"],
					daysToExpire: "1",
				});
				if (tokenResponse.token !== undefined) {
					apiToken = tokenResponse.token;
				}
			}
		}

		const response: ResponseType = { user: register.user };

		if (apiToken !== undefined) {
			response.apiToken = apiToken;
		}

		return res.status(200).json(response);
	} catch (cause) {
		return handleApiErrors(cause, res);
	}
};
