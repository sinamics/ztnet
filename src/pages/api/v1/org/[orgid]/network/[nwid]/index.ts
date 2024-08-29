import { Role, network } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { AuthorizationType } from "~/types/apiTypes";
import { SecuredOrganizationApiRoute } from "~/utils/apiAuth";
import { decryptAndVerifyToken } from "~/utils/encryption";
import { handleApiErrors } from "~/utils/errors";
import rateLimit from "~/utils/rateLimit";
import { checkUserOrganizationRole } from "~/utils/role";
import * as ztController from "~/utils/ztApi";

// Number of allowed requests per minute
const limiter = rateLimit({
	interval: 60 * 1000, // 60 seconds
	uniqueTokenPerInterval: 500, // Max 500 users per second
});

// Function to parse and validate fields based on the expected type
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const parseField = (key: string, value: any, expectedType: string) => {
	if (expectedType === "object") {
		return value;
	}
	if (expectedType === "array") {
		return value;
	}
	if (expectedType === "string") {
		return value;
	}
	if (expectedType === "boolean") {
		if (value === "true" || value === "false") {
			return value === "true";
		}
		throw new Error(`Field '${key}' expected to be boolean, got: ${value}`);
	}
};

export const REQUEST_PR_MINUTE = 50;

export default async function apiNetworkByIdHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		await limiter.check(res, REQUEST_PR_MINUTE, "ORGANIZATION_NETWORKID_CACHE_TOKEN"); // 10 requests per minute
	} catch {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}
	// create a switch based on the HTTP method
	switch (req.method) {
		case "GET":
			await GET_network(req, res);
			break;
		case "POST":
			await POST_network(req, res);
			break;
		default:
			res.status(405).json({ error: "Method Not Allowed" });
			break;
	}
}
export const POST_network = async (req: NextApiRequest, res: NextApiResponse) => {
	const apiKey = req.headers["x-ztnet-auth"] as string;

	// network id
	const networkId = req.query?.nwid as string;

	// organization id
	const orgid = req.query?.orgid as string;
	const requestBody = req.body;

	try {
		if (!apiKey) {
			return res.status(400).json({ error: "API Key is required" });
		}

		if (!orgid) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		if (!networkId) {
			return res.status(400).json({ error: "Network ID is required" });
		}

		const decryptedData: { userId: string; name?: string } = await decryptAndVerifyToken({
			apiKey,
			apiAuthorizationType: AuthorizationType.ORGANIZATION,
		});

		// assemble the context object
		const ctx = {
			session: {
				user: {
					id: decryptedData.userId as string,
				},
			},
			prisma,
		};

		// Check if the user is an organization admin
		// TODO This might be redundant as the caller.createOrgNetwork will check for the same thing. Keeping it for now
		await checkUserOrganizationRole({
			ctx,
			organizationId: orgid,
			minimumRequiredRole: Role.READ_ONLY,
		});

		// structure of the updateableFields object:
		const updateableFields = {
			name: { type: "string", destinations: ["controller", "database"] },
			description: { type: "string", destinations: ["database"] },
			flowRule: { type: "string", destinations: ["custom"] },
			mtu: { type: "string", destinations: ["controller"] },
			private: { type: "boolean", destinations: ["controller"] },
			// capabilities: { type: "array", destinations: ["controller"] },
			dns: { type: "array", destinations: ["controller"] },
			ipAssignmentPools: { type: "array", destinations: ["controller"] },
			routes: { type: "array", destinations: ["controller"] },
			// rules: { type: "array", destinations: ["controller"] },
			// tags: { type: "array", destinations: ["controller"] },
			v4AssignMode: { type: "object", destinations: ["controller"] },
			v6AssignMode: { type: "object", destinations: ["controller"] },
		};

		const databasePayload: Partial<network> = {};
		const controllerPayload: Partial<network> = {};

		// @ts-expect-error
		const caller = appRouter.createCaller(ctx);

		// Iterate over keys in the request body
		for (const key in requestBody) {
			// Check if the key is not in updateableFields
			if (!(key in updateableFields)) {
				return res.status(400).json({ error: `Invalid field: ${key}` });
			}

			try {
				const parsedValue = parseField(key, requestBody[key], updateableFields[key].type);
				// if custom and flowRule call the caller.setFlowRule
				if (key === "flowRule") {
					// @ts-expect-error
					const caller = appRouter.createCaller(ctx);
					await caller.network.setFlowRule({
						nwid: networkId,
						updateParams: {
							flowRoute: parsedValue,
						},
					});
				}
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

		const network = await caller.network
			.getNetworkById({ nwid: networkId })
			.then(async (res) => {
				return res.network || null;
			});

		if (!network) {
			return res.status(401).json({ error: "Network not found or access denied." });
		}

		/**
		 * Update the network in the controller
		 */
		if (Object.keys(controllerPayload).length > 0) {
			await ztController.network_update({
				// @ts-expect-error
				ctx,
				nwid: networkId,
				// @ts-expect-error
				updateParams: controllerPayload,
			});
		}

		if (Object.keys(databasePayload).length > 0) {
			await ctx.prisma.network.update({
				where: {
					nwid: networkId,
				},
				data: {
					...databasePayload,
				},
			});
		}

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

export const GET_network = SecuredOrganizationApiRoute(
	{ requiredRole: Role.READ_ONLY, requireNetworkId: true },
	async (_req, res, { networkId, ctx }) => {
		try {
			const network = await prisma.network.findUnique({
				where: { nwid: networkId },
				select: { authorId: true, description: true },
			});

			if (!network) {
				return res.status(401).json({ error: "Network not found or access denied." });
			}

			const ztControllerResponse = await ztController.local_network_detail(
				//@ts-expect-error
				ctx,
				networkId,
				false,
			);
			return res.status(200).json({
				...network,
				...ztControllerResponse?.network,
			});
		} catch (cause) {
			return handleApiErrors(cause, res);
		}
	},
);
