import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { orgDecryptAndVerifyToken } from "~/utils/encryption";
import rateLimit from "~/utils/rateLimit";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

export default async function apiOrganizationHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "GET_ORGANIZATION_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_organization(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).end();
			break;
	}
}

const GET_organization = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;

	let decryptedData: { userId: string; name?: string; organizationId: string };
	try {
		decryptedData = await orgDecryptAndVerifyToken({ apiKey });
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}

	try {
		const organization = await prisma.organization
			.findFirst({
				where: {
					id: decryptedData.organizationId,
				},
				select: {
					id: true,
					orgName: true,
					ownerId: true,
					description: true,
					createdAt: true,
					users: {
						select: {
							id: true,
							name: true,
							email: true,
							organizationRoles: {
								where: {
									organizationId: decryptedData.organizationId,
								},
								select: {
									role: true,
								},
							},
						},
					},
				},
			})
			.then((organization) => ({
				...organization,
				users: organization.users.map((user) => ({
					...user,
					orgRole:
						user.organizationRoles.length > 0 ? user.organizationRoles[0].role : null,
					organizationId: decryptedData.organizationId,
					organizationRoles: undefined, // Optionally remove organizationRoles if not needed in final output
				})),
			}));

		return res.status(200).json(organization);
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
