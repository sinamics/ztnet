import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { hasOrganizationWritePermission } from "~/server/api/services/orgAuthService";
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
			await GET_organization(req, res);
			break;
		default: // Method Not Allowed
			res.status(405).end();
			break;
	}
}

const GET_organization = async (req: NextApiRequest, res: NextApiResponse) => {
	// Does this endpoint requires an user with admin privileges.
	const NEEDS_USER_ADMIN = false;

	// Does this endpoint requires an Organization admin user.
	const NEEDS_ORG_WRITE_PERMISSION = true;

	const apiKey = req.headers["x-ztnet-auth"] as string;
	const orgid = req.query?.orgid as string;

	let decryptedData: { userId: string; name?: string };
	try {
		decryptedData = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
			requireAdmin: NEEDS_USER_ADMIN,
		});
	} catch (error) {
		return res.status(401).json({ error: error.message });
	}
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
	// TODO redundant as the caller.getOrgById will check for the same thing
	if (NEEDS_ORG_WRITE_PERMISSION) {
		const isOrgAdmin = await hasOrganizationWritePermission({
			orgId: orgid,
			userId: decryptedData.userId,
		});
		if (!isOrgAdmin) {
			return res.status(401).json({ error: "Unauthorized" });
		}
	}

	await checkUserOrganizationRole({
		ctx,
		organizationId: orgid,
		minimumRequiredRole: Role.READ_ONLY,
	});

	try {
		// const organization = await prisma.organization.findFirst({
		// 	where: {
		// 		id: orgid,
		// 	},
		// 	include: {
		// 		networks: true,
		// 	},
		// });

		//@ts-expect-error
		const caller = appRouter.createCaller(ctx);
		const organization = await caller.org
			.getOrgById({
				organizationId: orgid,
			})
			// modify the response to only inlude certain fields
			.then((org) => {
				return {
					id: org.id,
					name: org.orgName,
					createdAt: org.createdAt,
					ownerId: org.ownerId,
					networks: org.networks.map((network) => {
						return {
							nwid: network.nwid,
							name: network.name,
						};
					}),
				};
			});

		// const arr = [];
		// for (const network of organization?.networks) {
		// 	const ztControllerResponse = await ztController.local_network_detail(
		// 		//@ts-expect-error
		// 		ctx,
		// 		network.nwid,
		// 		false,
		// 	);
		// 	arr.push(ztControllerResponse.network);
		// }
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
