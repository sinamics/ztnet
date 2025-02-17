"use server";

import * as ztController from "~/utils/ztApi";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";
import { type NetworkInput, networkInputSchema } from "../../schemas/getNetworkById";
import { IPv4gen } from "~/utils/IPv4gen";
import { syncNetworkRoutes } from "~/server/api/services/routesService";
import { AuthContextManager } from "~/lib/authContext";
import type { NetworkEntity } from "~/types/local/network";

class NetworkActionError extends Error {
	constructor(
		message: string,
		public statusCode: number,
	) {
		super(message);
		this.name = "NetworkActionError";
	}
}

async function getUserId(): Promise<string> {
	// Try to get WebSocket context first
	const wsContext = AuthContextManager.getInstance().getContext();

	if (wsContext) {
		return wsContext.userId;
	}

	// Regular HTTP context
	const session = await auth();
	if (!session?.user) {
		throw new NetworkActionError("Unauthorized", 401);
	}
	return session.user.id;
}

export async function getNetworkInfo(input: NetworkInput): Promise<NetworkEntity> {
	try {
		const parsedInput = networkInputSchema.parse(input);
		const userId = await getUserId();

		// Handle central network case
		if (parsedInput.central) {
			const centralResponse = await ztController.central_network_detail(
				userId,
				parsedInput.nwid,
				parsedInput.central,
			);
			return {
				network: centralResponse.network,
			};
		}

		// Get network from database
		const networkFromDatabase = await prisma.network.findUnique({
			where: {
				nwid: parsedInput.nwid,
			},
			include: {
				organization: true,
				routes: true,
			},
		});

		if (!networkFromDatabase) {
			throw new NetworkActionError("Network not found!", 404);
		}

		// Check permissions
		const isAuthor = networkFromDatabase.authorId === userId;
		const isMemberOfOrganization = networkFromDatabase.organizationId
			? await prisma.organization.findFirst({
					where: {
						id: networkFromDatabase.organizationId,
						users: {
							some: { id: userId },
						},
					},
				})
			: null;

		if (!isAuthor && !isMemberOfOrganization) {
			throw new NetworkActionError("You do not have access to this network!", 403);
		}

		// Get network details from ZT controller
		const ztControllerResponse = await ztController
			.ZTApiGetNetworkInfo(userId, networkFromDatabase.nwid, false)
			.catch((err) => {
				throw new NetworkActionError(`Controller error: ${err.message}`, 500);
			});

		if (!ztControllerResponse) {
			throw new NetworkActionError("Failed to get network details!", 500);
		}

		// Generate CIDR options
		const { cidrOptions } = IPv4gen(null, []);

		// Sync network routes
		await syncNetworkRoutes({
			networkId: parsedInput.nwid,
			networkFromDatabase,
			ztControllerRoutes: ztControllerResponse.network.routes,
		});

		// Check for duplicate routes
		let duplicateRoutes = [];
		const targetIPs = ztControllerResponse.network.routes.map((route) => route.target);

		if (targetIPs.length > 0 && !isMemberOfOrganization) {
			duplicateRoutes = await prisma.$queryRaw`
        SELECT
          n."authorId",
          n."name",
          n."nwid",
          array_agg(
            json_build_object(
              'id', r."id",
              'target', r."target",
              'via', r."via"
            )
          ) as routes
        FROM "network" n
        INNER JOIN "Routes" r ON r."networkId" = n."nwid"
        WHERE n."authorId" = ${userId}
          AND n."organizationId" IS NULL
          AND r."target" = ANY(${targetIPs}::text[])
          AND n."nwid" != ${parsedInput.nwid}
        GROUP BY n."authorId", n."name", n."nwid"
      `;
		}

		const duplicatedIPs = duplicateRoutes.flatMap((network) =>
			network.routes
				.filter((route) => targetIPs.includes(route.target))
				.map((route) => route.target),
		);

		const uniqueDuplicatedIPs = [...new Set(duplicatedIPs)];

		// Get final network state
		const updatedNetworkFromDatabase = await prisma.network.findUnique({
			where: {
				nwid: parsedInput.nwid,
			},
			include: {
				organization: true,
				routes: true,
			},
		});

		return {
			network: {
				...ztControllerResponse?.network,
				...updatedNetworkFromDatabase,
				cidr: cidrOptions,
				duplicateRoutes: duplicateRoutes.map((network) => ({
					...network,
					duplicatedIPs: uniqueDuplicatedIPs,
				})),
			},
		};
	} catch (error) {
		if (error instanceof NetworkActionError) {
			throw error;
		}
		console.error("Unexpected error in getNetworkInfo:", error);
		throw new NetworkActionError("An unexpected error occurred", 500);
	}
}
