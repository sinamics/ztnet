import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import rateLimit from "~/utils/rateLimit";

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
		await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
			requireAdmin: NEEDS_ORG_ADMIN,
		});
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}

	try {
		const users = await prisma.organization
			.findFirst({
				where: {
					id: orgid,
				},
				include: {
					users: {
						select: {
							id: true,
							email: true,
							name: true,
							role: true,
						},
					},
				},
			})
			// construct user object, {orgId, userId, email, name, role}
			.then((org) => {
				if (!org) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: JSON.stringify({
							orgid: "Organization not found",
						}),
					});
				}
				return org.users.map((user) => ({
					orgId: org.id,
					userId: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
				}));
			});

		return res.status(200).json(users);
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
