import { Role, network_members } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { decryptAndVerifyToken } from "~/utils/encryption";
import rateLimit from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";
import * as ztController from "~/utils/ztApi";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

const REQUEST_PR_MINUTE = 50;

// Function to parse and validate fields based on the expected type
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const parseField = (key: string, value: any, expectedType: string) => {
	if (expectedType === "string") {
		return value; // Assume all strings are valid
	}
	if (expectedType === "boolean") {
		if (value === "true" || value === "false") {
			return value === "true";
		}
		throw new Error(`Field '${key}' expected to be boolean, got: ${value}`);
	}
};

export default async function apiNetworkUpdateMembersHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "UPDATE_USER_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	// create a switch based on the HTTP method
	switch (req.method) {
		case "POST":
			await POST_orgUpdateNetworkMember(req, res);
			break;
		case "DELETE":
			await DELETE_orgStashNetworkMember(req, res);
			break;
		default:
			// Method Not Allowed
			res.status(405).end();
			break;
	}
}

/**
 * Handles the POST request to update network members.
 *
 * @param req - The NextApiRequest object.
 * @param res - The NextApiResponse object.
 * @returns A JSON response indicating the success or failure of the update operation.
 */
const POST_orgUpdateNetworkMember = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;
	const networkId = req.query?.nwid as string;
	const memberId = req.query?.memberId as string;
	const requestBody = req.body;
	// organization id
	const orgid = req.query?.orgid as string;

	if (Object.keys(requestBody).length === 0) {
		return res.status(400).json({ error: "No data provided for update" });
	}

	let decryptedData: { userId: string; name?: string };
	try {
		decryptedData = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		// Check if the networkId exists
		if (!networkId) {
			return res.status(400).json({ error: "Network ID is required" });
		}

		// Check if the networkId exists
		if (!memberId) {
			return res.status(400).json({ error: "Member ID is required" });
		}

		// Check if the orgid exists
		if (!orgid) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		// structure of the updateableFields object:
		const updateableFields = {
			name: { type: "string", destinations: ["database"] },
			authorized: { type: "boolean", destinations: ["controller"] },
		};

		const databasePayload: Partial<network_members> = {};
		const controllerPayload: Partial<network_members> = {};

		// Iterate over keys in the request body
		for (const key in requestBody) {
			// Check if the key is not in updateableFields
			if (!(key in updateableFields)) {
				return res.status(400).json({ error: `Invalid field: ${key}` });
			}

			try {
				const parsedValue = parseField(key, requestBody[key], updateableFields[key].type);
				if (updateableFields[key].destinations.includes("database")) {
					databasePayload[key] = parsedValue;
				}
				if (updateableFields[key].destinations.includes("controller")) {
					controllerPayload[key] = parsedValue;
				}
			} catch (error) {
				return res.status(400).json({ error: error.message });
			}
		}

		// assemble the context object
		const ctx = {
			session: {
				user: {
					id: decryptedData.userId as string,
				},
			},
			prisma,
			wss: null,
		};

		// Check if the user is an organization admin
		await checkUserOrganizationRole({
			ctx,
			organizationId: orgid,
			minimumRequiredRole: Role.USER,
		});

		// make sure the member is valid
		const network = await prisma.network.findUnique({
			where: { nwid: networkId, organizationId: orgid },
			include: {
				networkMembers: {
					where: { id: memberId },
				},
			},
		});

		if (!network?.networkMembers || network.networkMembers.length === 0) {
			return res
				.status(401)
				.json({ error: "Member or Network not found or access denied." });
		}

		if (Object.keys(databasePayload).length > 0) {
			// if users click the re-generate icon on IP address
			await ctx.prisma.network.update({
				where: {
					nwid: networkId,
				},
				data: {
					networkMembers: {
						update: {
							where: {
								id_nwid: {
									id: memberId,
									nwid: networkId, // this should be the value of `nwid` you are looking for
								},
							},
							data: {
								...databasePayload,
							},
						},
					},
				},
				select: {
					networkMembers: {
						where: {
							id: memberId,
						},
					},
				},
			});
		}

		if (Object.keys(controllerPayload).length > 0) {
			await ztController.member_update({
				// @ts-expect-error
				ctx,
				nwid: networkId,
				memberId: memberId,
				// @ts-expect-error
				updateParams: controllerPayload,
			});
		}

		// @ts-expect-error
		const caller = appRouter.createCaller(ctx);
		const networkAndMembers = await caller.networkMember.getMemberById({
			nwid: networkId,
			id: memberId,
		});

		return res.status(200).json(networkAndMembers);
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

/**
 * Handles the HTTP DELETE request to delete a member from a network.
 *
 * @param req - The NextApiRequest object representing the incoming request.
 * @param res - The NextApiResponse object representing the outgoing response.
 * @returns A JSON response indicating the success or failure of the operation.
 */
const DELETE_orgStashNetworkMember = async (
	req: NextApiRequest,
	res: NextApiResponse,
) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;
	const networkId = req.query?.nwid as string;
	const memberId = req.query?.memberId as string;

	// organization id
	const orgid = req.query?.orgid as string;

	try {
		const decryptedData: { userId: string; name?: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		// Check if the networkId exists
		if (!networkId) {
			return res.status(400).json({ error: "Network ID is required" });
		}

		// Check if the networkId exists
		if (!memberId) {
			return res.status(400).json({ error: "Member ID is required" });
		}

		// assemble the context object
		const ctx = {
			session: {
				user: {
					id: decryptedData.userId as string,
				},
			},
			prisma,
			wss: null,
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
		const networkAndMembers = await caller.networkMember.stash({
			nwid: networkId,
			id: memberId,
			organizationId: orgid,
		});

		return res.status(200).json(networkAndMembers);
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
