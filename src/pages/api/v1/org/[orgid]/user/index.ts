import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import rateLimit from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";

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
		await limiter.check(res, REQUEST_PR_MINUTE, "CREATE_USER_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_organizationUsers(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).end();
			break;
	}
}

const GET_organizationUsers = async (req: NextApiRequest, res: NextApiResponse) => {
	// Does this endpoint requires an admin user.
	const NEEDS_ORG_ADMIN = false;

	const apiKey = req.headers["x-ztnet-auth"] as string;
	const orgid = req.query?.orgid as string;

	try {
		const decryptedData: { userId: string; name?: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
			requireAdmin: NEEDS_ORG_ADMIN,
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
		// TODO This might be redundant as the caller.getOrgById will check for the same thing
		await checkUserOrganizationRole({
			ctx,
			organizationId: orgid,
			minimumRequiredRole: Role.READ_ONLY,
		});

		// @ts-expect-error ctx is not a valid parameter
		const caller = appRouter.createCaller(ctx);
		const orgUsers = await caller.org
			.getOrgUsers({
				organizationId: orgid,
			})
			.then((users) => {
				return users.map((user) => ({
					orgId: orgid,
					userId: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
				}));
			});

		return res.status(200).json(orgUsers);
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

		if (cause instanceof Error) {
			return res.status(500).json({ message: cause.message });
		}
		return res.status(500).json({ message: "Internal server error" });
	}
};
